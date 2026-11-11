import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { getSocialSocket, setSocialSocket } from "../../../services/socket/socketClient";
import { useAuth } from "../../auth/hooks/useAuth";
import { mergeMessage, hideMessage, markReceipt } from "../messaging/messageCache";

/** Socket subscriptions live at the layout level, not inside each message bubble. */
export function useRealtime() {
  const { user } = useAuth();
  const query = useQueryClient();
  useEffect(() => {
    if (!user?.id) return undefined;
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"], reconnection: true, reconnectionDelayMax: 5000 });
    setSocialSocket(socket);
    const messagesKey = (id) => ["messages", id];
    // Message/new and conversation/updated often arrive within milliseconds.
    // Coalesce the list refresh to avoid duplicate network requests and flicker.
    let conversationRefreshTimer = null;
    const scheduleConversationRefresh = () => {
      if (conversationRefreshTimer !== null) return;
      conversationRefreshTimer = window.setTimeout(() => {
        conversationRefreshTimer = null;
        query.invalidateQueries({ queryKey: ["conversations"] });
      }, 100);
    };
    const acknowledge = (conversationId, messageIds) => {
      if (socket.connected && messageIds.length) socket.emit("message:delivered", { conversationId, messageIds });
    };
    const receive = (payload) => {
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;
      query.setQueryData(messagesKey(conversationId), (old) => old ? mergeMessage(old, message) : old);
      if (!query.getQueryData(messagesKey(conversationId))) query.invalidateQueries({ queryKey: messagesKey(conversationId) });
      scheduleConversationRefresh();
      if (message.senderId !== user.id) acknowledge(conversationId, [message._id]);
    };
    const changed = (payload) => {
      const { conversationId, message } = payload || {};
      if (!conversationId || !message) return;
      query.setQueryData(messagesKey(conversationId), (old) => old ? mergeMessage(old, message) : old);
      scheduleConversationRefresh();
    };
    const delivered = ({ conversationId, messageId, userId }) => {
      query.setQueryData(messagesKey(conversationId), (old) => markReceipt(old, { type: "delivery", messageId, userId }));
    };
    const deliveredToOwnDevices = ({ conversationId, messageIds, userId }) => {
      if (userId !== user.id || !Array.isArray(messageIds)) return;
      query.setQueryData(messagesKey(conversationId), (old) =>
        messageIds.reduce((cache, messageId) => markReceipt(cache, { type: "delivery", messageId, userId }), old));
    };
    const read = ({ id, userId, readAt }) => {
      // Own read events should refresh badges but not re-send read receipts.
      if (userId === user.id) { scheduleConversationRefresh(); return; }
      query.setQueryData(messagesKey(id), (old) => markReceipt(old, { type: "read", userId, readAt }));
      scheduleConversationRefresh();
    };
    const hidden = ({ conversationId, messageId }) => {
      query.setQueryData(messagesKey(conversationId), (old) => hideMessage(old, messageId));
      scheduleConversationRefresh();
    };
    const sync = ({ conversationId, messageIds }) => {
      acknowledge(conversationId, messageIds || []);
      query.invalidateQueries({ queryKey: messagesKey(conversationId) });
      scheduleConversationRefresh();
    };
    const refreshed = () => {
      query.invalidateQueries({ queryKey: ["communities", "unread-summary"] });
      query.invalidateQueries({ queryKey: ["community", "unread"] });
      query.invalidateQueries({ queryKey: ["messages"] });
      query.invalidateQueries({ queryKey: ["conversations"] });
      query.invalidateQueries({ queryKey: ["notifications", "summary"] });
    };
    socket.on("message:new", receive);
    socket.on("message:updated", changed);
    socket.on("message:delivery", delivered);
    socket.on("message:delivery:own", deliveredToOwnDevices);
    socket.on("message:hidden", hidden);
    socket.on("message:sync", sync);
    socket.on("conversation:read", read);
    socket.on("conversation:updated", scheduleConversationRefresh);
    socket.on("conversation:removed", scheduleConversationRefresh);
    socket.on("relationship:changed", () => {
      for (const key of ["people", "friends", "follows", "subscriptions"]) query.invalidateQueries({ queryKey: [key] });
    });
    // Live changes update existing pages in memory rather than refetching
    // every previously loaded page of an infinite notification list.
    const notificationNew = (item) => {
      query.invalidateQueries({ queryKey: ["notifications", "summary"] });
      if (!item?._id || !item.type) return;
      query.setQueryData(["notifications", "feed"], old => {
        if (!old?.pages?.length) return old;
        const wasLoaded = old.pages.some(p => p.items?.some(n => String(n._id) === String(item._id)));
        const title = item.type === 'friend_accepted' && item.groupCount > 1
          ? `${item.groupLeadName || 'A friend'} and ${item.groupCount - 1} ${item.groupCount === 2 ? 'other' : 'others'} accepted your friend requests`
          : item.title;
        const entry = { ...item, title };
        const pages = old.pages.map((p, i) => ({ ...p, items: (p.items || [])
          .filter(n => String(n._id) !== String(entry._id)) }));
        // For a new event, only the newest page changes. Group updates retain
        // their place so the pagination cursor remains stable.
        if (!wasLoaded) pages[0].items = [entry, ...pages[0].items];
        else {
          const originalIndex = old.pages.findIndex(p => p.items?.some(n => String(n._id) === String(entry._id)));
          pages[originalIndex].items = [entry, ...pages[originalIndex].items];
        }
        return { ...old, pages };
      });
    };
    const notificationUpdated = event => {
      query.invalidateQueries({ queryKey: ["notifications", "summary"] });
      if (!event?.all && !event?.readId) return;
      query.setQueryData(["notifications", "feed"], old => old?.pages ? ({ ...old,
        pages: old.pages.map(p => ({ ...p, items: (p.items || []).map(item =>
          event.all || String(item._id) === String(event.readId)
            ? { ...item, readAt: item.readAt || new Date().toISOString() } : item) })) }) : old);
    };
    socket.on("notification:new", notificationNew);
    socket.on("notification:updated", notificationUpdated);
    const communityUnreadChanged = () => {
      query.invalidateQueries({ queryKey: ["communities", "unread-summary"] });
      query.invalidateQueries({ queryKey: ["community", "unread"] });
    };
    socket.on("community:message:activity", communityUnreadChanged);
    socket.on("community:unread:updated", communityUnreadChanged);
    socket.on("community:member", communityUnreadChanged);
    socket.on("community:removed", communityUnreadChanged);
    socket.on("feed:new", () => query.invalidateQueries({ queryKey: ["feed", "posts"] }));
    socket.on("presence:changed", () => query.invalidateQueries({ queryKey: ["presence", "friends"] }));
    socket.on("connect", refreshed);
    socket.on("connect_error", (error) => console.warn("Chat connection problem:", error.message));
    return () => {
      if (conversationRefreshTimer !== null) window.clearTimeout(conversationRefreshTimer);
      socket.removeAllListeners(); socket.disconnect();
      if (getSocialSocket() === socket) setSocialSocket(null);
    };
  }, [user?.id, query]);
}
