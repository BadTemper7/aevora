import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowDown,
  Hash,
  LoaderCircle,
  Megaphone,
  MessageCircleReply,
  MessagesSquare,
  MoreHorizontal,
  Pin,
  Reply,
  Search,
  X,
} from "lucide-react";
import ChatComposer from "../../social/messaging/ChatComposer";
import EmojiPicker from "../../../components/common/EmojiPicker";
import { mediaFile } from "../../social/api/socialApi";
import {
  communityCreate,
  communityRead,
  communityPatch,
  communityDelete,
  communityPut,
  communityError,
} from "../api/communityApi";
import { subscribeSocialSocket } from "../../../services/socket/socketClient";
import {
  field,
  smallButton,
  ErrorNotice,
} from "../../social/components/SocialUI";
import { useAuth } from "../../auth/hooks/useAuth";

const quick = ["👍", "❤️", "😆", "😮"];
export const headerButton =
  "inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-line bg-surface/60 px-2.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-raised hover:text-ink";
const GROUP_MS = 5 * 60 * 1000;

function getAllPages(cache) {
  return (
    cache?.pages
      ?.slice()
      .reverse()
      .flatMap((p) => p.items || []) || []
  );
}
export function mergeCommunityMessage(cache, message, update = false) {
  if (!cache?.pages?.length) return cache;
  let found = false;
  const pages = cache.pages.map((p) => ({
    ...p,
    items: p.items.map((m) => {
      if (
        m.id === message.id ||
        (message.clientId && m.clientId === message.clientId)
      ) {
        found = true;
        return { ...m, ...message };
      }
      return m;
    }),
  }));
  if (!found && !update)
    pages[0] = { ...pages[0], items: [...pages[0].items, message] };
  return { ...cache, pages };
}
const shortTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

function DayDivider({ date }) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const label =
    d.toDateString() === today.toDateString()
      ? "Today"
      : d.toDateString() === yesterday.toDateString()
        ? "Yesterday"
        : d.toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
  return (
    <div role="separator" className="my-4 flex items-center gap-3 px-3">
      <span className="h-px flex-1 bg-line" />
      <span className="rounded-full border border-line bg-surface px-3 py-0.5 text-[11px] font-semibold text-ink-soft">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function SafeMedia({ message }) {
  if (!message.gifUrl && !message.mediaIds?.length) return null;
  return (
    <div className="mt-2 flex max-w-full flex-col gap-2">
      {message.gifUrl && (
        <img
          src={message.gifUrl}
          loading="lazy"
          alt="Shared GIF"
          className="max-h-72 max-w-[min(300px,100%)] rounded-2xl object-contain"
        />
      )}
      {message.mediaIds?.map((id) => (
        <CommunityAttachment key={String(id)} id={String(id)} />
      ))}
    </div>
  );
}
function CommunityAttachment({ id }) {
  // Secure media responses are gated by the existing Better Auth session and channel membership.
  const src = mediaFile(id);
  return (
    <div className="max-w-[min(340px,100%)] overflow-hidden rounded-2xl border border-line bg-surface">
      <img
        src={mediaFile(id, true)}
        alt="Community attachment preview"
        loading="lazy"
        className="max-h-64 w-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="block px-3 py-2 text-xs font-semibold text-brand-ink underline"
      >
        Open attachment
      </a>
    </div>
  );
}

function ChatBubble({
  message,
  me,
  canModerate,
  grouped,
  onReply,
  onEdit,
  onChange,
  threadOpen,
  onThread,
}) {
  const [menu, setMenu] = useState(false),
    [emojiOpen, setEmojiOpen] = useState(false),
    [error, setError] = useState("");
  const anchor = useRef(null);
  const run = async (action) => {
    setError("");
    setMenu(false);
    try {
      await action();
    } catch (err) {
      setError(communityError(err));
    }
  };
  const own = message.senderId === me;
  const editable = own && !message.deletedAt;
  const deleted = Boolean(message.deletedAt);
  const name = message.sender?.name || message.sender?.username || "Member";
  return (
    <article
      id={`community-message-${message.id}`}
      className={`group relative flex gap-3 px-3 ${grouped ? "py-0.5" : "pb-0.5 pt-2.5"}`}
    >
      <div className="w-9 shrink-0">
        {grouped ? (
          <time className="block pt-2 text-center text-[10px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100">
            {shortTime(message.createdAt)}
          </time>
        ) : (
          <div className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand-soft text-sm font-extrabold text-brand-ink ring-2 ring-surface">
            {message.sender?.image ? (
              <img
                src={message.sender.image}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="mb-1 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-extrabold text-ink">{name}</span>
            <time
              title={
                message.createdAt
                  ? new Date(message.createdAt).toLocaleString()
                  : ""
              }
              className="text-[11px] text-ink-faint"
            >
              {shortTime(message.createdAt)}
            </time>
            {message.editedAt && (
              <span className="text-[11px] text-ink-faint">Edited</span>
            )}
            {message.pinnedAt && (
              <span title="Pinned" className="text-brand-ink">
                <Pin size={12} />
              </span>
            )}
          </div>
        )}
        {deleted ? (
          <p className="text-sm italic text-ink-faint">Message deleted</p>
        ) : (
          <>
            {message.replyTo && (
              <p className="mb-1 flex items-center gap-1 text-xs text-ink-soft">
                <Reply size={11} />
                Replying to an earlier message
              </p>
            )}
            {message.content && (
              <p
                className={`inline-block max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6 text-ink ${own ? "bg-brand-soft" : "bg-raised/80"} ${grouped ? "" : "rounded-tl-md"}`}
              >
                {message.content}
              </p>
            )}
            <SafeMedia message={message} />
          </>
        )}
        {message.reactions?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[...new Set(message.reactions.map((r) => r.emoji))].map((e) => (
              <button
                key={e}
                onClick={() =>
                  !deleted &&
                  run(() => onChange("react", message, { emoji: e }))
                }
                aria-label={`React ${e}`}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${message.reactions.some((r) => r.emoji === e && r.userId === me) ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-raised"}`}
              >
                {e} {message.reactions.filter((r) => r.emoji === e).length}
              </button>
            ))}
          </div>
        )}
        {message.optimistic && (
          <span className="text-[11px] text-ink-faint">
            {message.failed ? "Failed to send" : "Sending..."}
          </span>
        )}
        {message.failed && (
          <button
            className="ml-2 text-xs text-danger underline"
            onClick={() => onChange("retry", message)}
          >
            Retry
          </button>
        )}
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      {!deleted && !message.optimistic && (
        <div className="absolute -top-3 right-3 z-10 hidden items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lg group-focus-within:flex group-hover:flex">
          {quick.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`React ${e}`}
              title={`React ${e}`}
              className="rounded-lg p-1 text-sm transition-transform hover:scale-125 hover:bg-raised"
              onClick={() =>
                run(() => onChange("react", message, { emoji: e }))
              }
            >
              {e}
            </button>
          ))}
          <div className="relative">
            <button
              ref={anchor}
              type="button"
              aria-label="More emoji reactions"
              onClick={() => setEmojiOpen((v) => !v)}
              className="rounded-lg px-1.5 text-ink-soft hover:bg-raised"
            >
              +
            </button>
            <EmojiPicker
              open={emojiOpen}
              anchorRef={anchor}
              onClose={() => setEmojiOpen(false)}
              onSelect={(e) => {
                setEmojiOpen(false);
                run(() => onChange("react", message, { emoji: e }));
              }}
            />
          </div>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <button
            type="button"
            title="Reply"
            aria-label="Reply"
            className="rounded-lg p-1.5 text-ink-soft hover:bg-raised hover:text-ink"
            onClick={() => onReply(message)}
          >
            <Reply size={15} />
          </button>
          {threadOpen && (
            <button
              type="button"
              title="Open thread"
              aria-label="Open thread"
              className="rounded-lg p-1.5 text-ink-soft hover:bg-raised hover:text-ink"
              onClick={() => onThread(message)}
            >
              <MessageCircleReply size={15} />
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-expanded={menu}
              aria-label="More message actions"
              onClick={() => setMenu((v) => !v)}
              className="rounded-lg p-1.5 text-ink-soft hover:bg-raised hover:text-ink"
            >
              <MoreHorizontal size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col rounded-xl border border-line bg-surface p-1 shadow-2xl">
                {editable && (
                  <button
                    className="rounded-lg px-2.5 py-2 text-left text-xs hover:bg-raised"
                    onClick={() => {
                      setMenu(false);
                      onEdit(message);
                    }}
                  >
                    Edit message
                  </button>
                )}
                {canModerate && (
                  <button
                    className="rounded-lg px-2.5 py-2 text-left text-xs hover:bg-raised"
                    onClick={() =>
                      run(() =>
                        onChange("pin", message, { pinned: !message.pinnedAt }),
                      )
                    }
                  >
                    {message.pinnedAt ? "Unpin message" : "Pin message"}
                  </button>
                )}
                {message.content && (
                  <button
                    className="rounded-lg px-2.5 py-2 text-left text-xs hover:bg-raised"
                    onClick={() => {
                      navigator.clipboard?.writeText(message.content);
                      setMenu(false);
                    }}
                  >
                    Copy message
                  </button>
                )}
                {(editable || canModerate) && (
                  <button
                    className="rounded-lg px-2.5 py-2 text-left text-xs text-danger hover:bg-danger/10"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this message for all community members?",
                        )
                      )
                        run(() => onChange("delete", message));
                    }}
                  >
                    Delete message
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ChannelChat({
  channel,
  permissions,
  threadId = null,
  onThread,
  actions = null,
}) {
  const { user } = useAuth();
  const me = user?.id;
  const client = useQueryClient();
  const channelId = String(channel.id || channel._id);
  const key = ["community", "channel-messages", channelId, threadId || "main"];
  const messages = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      communityRead(`/channels/${channelId}/messages`, {
        limit: 30,
        before: pageParam,
        threadId: threadId || undefined,
      }),
    getNextPageParam: (p) => (p.hasMore ? p.nextCursor : undefined),
  });
  const [text, setText] = useState(""),
    [media, setMedia] = useState(null),
    [reply, setReply] = useState(null),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [optimistic, setOptimistic] = useState([]),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [pinsOpen, setPinsOpen] = useState(false),
    [atBottom, setAtBottom] = useState(true);
  const endRef = useRef(null),
    stick = useRef(true);
  const searchResults = useQuery({
    queryKey: ["community", "search", channelId, search],
    queryFn: () =>
      communityRead(`/channels/${channelId}/search`, { q: search }),
    enabled: searchOpen && search.trim().length >= 2,
  });
  const pinned = useQuery({
    queryKey: ["community", "pins", channelId],
    queryFn: () => communityRead(`/channels/${channelId}/pins`),
    enabled: pinsOpen,
  });
  useEffect(() => {
    setText("");
    setMedia(null);
    setReply(null);
    setEditing(null);
    setOptimistic([]);
    setSearchOpen(false);
    stick.current = true;
    setAtBottom(true);
  }, [channelId, threadId]);
  // Socket updates are persisted server events. No poll-to-deliver delay and no duplicate optimistic entries.
  useEffect(
    () =>
      subscribeSocialSocket((socket) => {
        if (!socket) return;
        const join = () =>
          socket.emit("community:join", { channelId }, (response) => {
            if (response?.ok === false) setError(response.error);
            else client.invalidateQueries({ queryKey: key });
          });
        socket.on("connect", join);
        if (socket.connected) join();
        const changed = ({ channelId: target, message }) => {
          if (
            target !== channelId ||
            !message ||
            String(message.threadId || "") !== String(threadId || "")
          )
            return;
          client.setQueryData(key, (old) =>
            mergeCommunityMessage(old, message, Boolean(message.deletedAt)),
          );
          setOptimistic((list) =>
            list.filter((m) => m.clientId !== message.clientId),
          );
        };
        const pin = ({ channelId: target }) => {
          if (target === channelId) {
            client.invalidateQueries({ queryKey: key });
            client.invalidateQueries({
              queryKey: ["community", "pins", channelId],
            });
          }
        };
        const reactions = ({ channelId: target, messageId, reactions }) => {
          if (target === channelId)
            client.setQueryData(key, (old) =>
              old
                ? {
                    ...old,
                    pages: old.pages.map((p) => ({
                      ...p,
                      items: p.items.map((m) =>
                        m.id === messageId ? { ...m, reactions } : m,
                      ),
                    })),
                  }
                : old,
            );
        };
        socket.on("community:message:new", changed);
        socket.on("community:message:updated", changed);
        socket.on("community:message:pinned", pin);
        socket.on("community:message:reactions", reactions);
        return () => {
          socket.off("connect", join);
          socket.off("community:message:new", changed);
          socket.off("community:message:updated", changed);
          socket.off("community:message:pinned", pin);
          socket.off("community:message:reactions", reactions);
          socket.emit("community:leave", { channelId });
        };
      }),
    [channelId, threadId, client],
  );
  const rows = useMemo(() => {
    const base = getAllPages(messages.data);
    const unique = new Map();
    for (const m of base) unique.set(m.id, m);
    for (const m of optimistic) {
      if (m.failed || !base.some((x) => x.clientId === m.clientId))
        unique.set(m.id, m);
    }
    return [...unique.values()].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages.data, optimistic]);
  // Only follow new messages when the reader is already at the bottom.
  useEffect(() => {
    if (stick.current)
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [channelId, rows.length]);
  const onScroll = (e) => {
    const el = e.currentTarget;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stick.current = near;
    setAtBottom(near);
  };
  const send = async (override = null, retry = null) => {
    if (busy || !permissions.includes("send_messages")) return;
    const content = override?.content ?? (editing ? text : text.trim());
    const mediaIds = override?.mediaIds ?? (media?.id ? [media.id] : []);
    const gifUrl = override?.gifUrl;
    if (!content?.trim() && !mediaIds.length && !gifUrl) return;
    setBusy(true);
    setError("");
    try {
      if (editing) {
        await communityPatch(`/channels/${channelId}/messages/${editing.id}`, {
          content: content.trim(),
        });
        setEditing(null);
        setText("");
        client.invalidateQueries({ queryKey: key });
        return;
      }
      const clientId = retry?.clientId || crypto.randomUUID();
      const payload = {
        clientId,
        content: content.trim(),
        mediaIds,
        gifUrl,
        replyTo: reply?.id,
        threadId: threadId || undefined,
      };
      if (!retry) {
        stick.current = true;
        setOptimistic((v) => [
          ...v,
          {
            id: `pending-${clientId}`,
            clientId,
            content: payload.content,
            mediaIds,
            gifUrl,
            senderId: me,
            sender: user,
            createdAt: new Date().toISOString(),
            optimistic: true,
            reactions: [],
          },
        ]);
        setText("");
        setMedia(null);
        setReply(null);
      }
      const message = await communityCreate(
        `/channels/${channelId}/messages`,
        payload,
      );
      client.setQueryData(key, (old) => mergeCommunityMessage(old, message));
      setOptimistic((v) => v.filter((m) => m.clientId !== clientId));
    } catch (err) {
      setError(communityError(err));
      if (retry)
        setOptimistic((v) =>
          v.map((m) =>
            m.clientId === retry.clientId ? { ...m, failed: true } : m,
          ),
        );
      else
        setOptimistic((v) =>
          v.map((m) => (m.optimistic ? { ...m, failed: true } : m)),
        );
    } finally {
      setBusy(false);
    }
  };
  const change = async (kind, msg, data) => {
    if (kind === "retry")
      return send(
        { content: msg.content, mediaIds: msg.mediaIds, gifUrl: msg.gifUrl },
        msg,
      );
    if (kind === "react") {
      const r = await communityPut(
        `/channels/${channelId}/messages/${msg.id}/reaction`,
        data,
      );
      client.setQueryData(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                items: p.items.map((m) =>
                  m.id === msg.id ? { ...m, reactions: r.reactions } : m,
                ),
              })),
            }
          : old,
      );
      return;
    }
    if (kind === "delete") {
      await communityDelete(`/channels/${channelId}/messages/${msg.id}`);
      client.invalidateQueries({ queryKey: key });
      return;
    }
    if (kind === "pin") {
      await communityCreate(
        `/channels/${channelId}/messages/${msg.id}/pin`,
        data,
      );
      client.invalidateQueries({ queryKey: key });
      return;
    }
  };
  useEffect(() => {
    if (!messages.isSuccess) return;
    const timer = setTimeout(() => {
      communityCreate(`/channels/${channelId}/read`, {})
        .then(() =>
          client.invalidateQueries({ queryKey: ["community", "unread"] }),
        )
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [channelId, messages.isSuccess, messages.dataUpdatedAt, client]);
  const canModerate = permissions.includes("manage_messages");
  const canSend =
    permissions.includes("send_messages") &&
    (channel.type !== "announcement" || canModerate);
  const HeaderIcon =
    channel.type === "announcement"
      ? Megaphone
      : channel.type === "forum"
        ? MessageCircleReply
        : Hash;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink">
            <HeaderIcon size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold">{channel.name}</h2>
            <p className="truncate text-xs text-ink-soft">
              {channel.topic || "Community text channel"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            className={`${headerButton} ${searchOpen ? "!border-brand/40 !text-brand-ink" : ""}`}
            title="Search channel"
            aria-label="Search channel"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={16} />
          </button>
          <button
            className={`${headerButton} ${pinsOpen ? "!border-brand/40 !text-brand-ink" : ""}`}
            title="Pinned messages"
            aria-label="Pinned messages"
            onClick={() => setPinsOpen((v) => !v)}
          >
            <Pin size={16} />
          </button>
          {actions}
        </div>
      </div>
      {searchOpen && (
        <div className="custom-scrollbar max-h-48 overflow-y-auto border-b border-line bg-raised/40 p-3">
          <label className="relative flex items-center gap-2">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              autoFocus
              className={`${field} !rounded-full !pl-10`}
              placeholder="Search messages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-raised"
            >
              <X size={17} />
            </button>
          </label>
          {searchResults.data?.items?.map((m) => (
            <button
              key={m.id}
              className="mt-1 block w-full rounded-xl p-2 text-left text-xs hover:bg-raised"
              onClick={() =>
                document
                  .getElementById(`community-message-${m.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              {m.content?.slice(0, 100)}
            </button>
          ))}
        </div>
      )}
      {pinsOpen && (
        <div className="custom-scrollbar max-h-48 overflow-y-auto border-b border-line bg-raised/40 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold">
            <Pin size={12} className="text-brand-ink" />
            Pinned messages
          </p>
          {pinned.data?.map((m) => (
            <button
              key={m.id}
              className="block w-full rounded-xl p-2 text-left text-xs hover:bg-raised"
              onClick={() => {
                document
                  .getElementById(`community-message-${m.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
                setPinsOpen(false);
              }}
            >
              {m.content?.slice(0, 120) || "Attachment"}
            </button>
          ))}
          {pinned.data?.length === 0 && (
            <p className="text-xs text-ink-soft">No pinned messages.</p>
          )}
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div
          className="custom-scrollbar h-full overflow-y-auto pb-4 pt-6"
          aria-label="Channel messages"
          onScroll={onScroll}
        >
          {messages.isLoading ? (
            <p role="status" className="p-4 text-sm text-ink-soft">
              <LoaderCircle className="mr-2 inline size-4 animate-spin" />
              Loading messages...
            </p>
          ) : messages.isError ? (
            <div className="p-3">
              <ErrorNotice error={messages.error} />
            </div>
          ) : (
            <>
              {messages.hasNextPage && (
                <div className="mb-4 text-center">
                  <button
                    disabled={messages.isFetchingNextPage}
                    className={smallButton}
                    onClick={() => messages.fetchNextPage()}
                  >
                    {messages.isFetchingNextPage
                      ? "Loading..."
                      : "Load older messages"}
                  </button>
                </div>
              )}
              {rows.length ? (
                rows.map((m, i) => {
                  const prev = rows[i - 1];
                  const newDay =
                    !prev ||
                    new Date(prev.createdAt).toDateString() !==
                      new Date(m.createdAt).toDateString();
                  const grouped =
                    !newDay &&
                    prev.senderId === m.senderId &&
                    !prev.deletedAt &&
                    !m.replyTo &&
                    Math.abs(
                      new Date(m.createdAt).getTime() -
                        new Date(prev.createdAt).getTime(),
                    ) < GROUP_MS;
                  return (
                    <div key={m.id}>
                      {newDay && <DayDivider date={m.createdAt} />}
                      <ChatBubble
                        message={m}
                        me={me}
                        grouped={grouped}
                        canModerate={canModerate}
                        onReply={setReply}
                        onEdit={(msg) => {
                          setEditing(msg);
                          setText(msg.content || "");
                          setReply(null);
                        }}
                        onChange={change}
                        threadOpen={channel.type === "forum"}
                        onThread={onThread}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <span className="grid size-16 place-items-center rounded-3xl bg-brand-soft text-brand-ink">
                    <MessagesSquare size={28} />
                  </span>
                  <div>
                    <p className="text-lg font-extrabold">
                      Welcome to #{channel.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      No messages yet. Start the conversation.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={endRef} />
        </div>
        {!atBottom && (
          <button
            type="button"
            onClick={() =>
              endRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              })
            }
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-bold text-on-brand shadow-xl transition hover:brightness-110"
          >
            <ArrowDown size={14} />
            Jump to latest
          </button>
        )}
      </div>
      {error && (
        <div className="border-t border-line px-3 py-2">
          <ErrorNotice error={error} />
        </div>
      )}
      {canSend ? (
        <div className="shrink-0 border-t border-line bg-surface/40">
          <ChatComposer
            text={text}
            setText={setText}
            media={media}
            setMedia={setMedia}
            reply={reply}
            cancelReply={() => setReply(null)}
            editing={editing}
            cancelEditing={() => {
              setEditing(null);
              setText("");
            }}
            onSubmit={() => send()}
            onGif={(gif) =>
              send({
                content: "",
                mediaIds: gif.mediaId ? [gif.mediaId] : [],
                gifUrl: gif.mediaId ? undefined : gif.url,
              })
            }
            onQuickEmoji={() => send({ content: "👍" })}
            busy={busy}
            mediaPurpose="community"
          />
        </div>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-ink-soft">
          You can read this channel but do not have permission to post.
        </p>
      )}
    </div>
  );
}
