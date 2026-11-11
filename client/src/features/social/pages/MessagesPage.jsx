import { ArrowLeft, CirclePlus, Info, ListFilter, MessageCircle, MoreHorizontal, Pin, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "./messageUuid";
import { useAuth } from "../../auth/hooks/useAuth";
import { useDebounce } from "../../../hooks/useDebounce";
import Avatar from "../../../components/ui/Avatar";
import Button from "../../../components/ui/Button";
import { getSocialSocket, subscribeSocialSocket } from "../../../services/socket/socketClient";
import { create, errorText, mediaFile, read, remove, update } from "../api/socialApi";
import MediaPicker from "../components/MediaPicker";
import { Empty, ErrorNotice, Loading, Tabs, field, panel, smallButton, useAction } from "../components/SocialUI";
import ChatMessage from "../messaging/ChatMessage";
import ChatComposer from "../messaging/ChatComposer";
import ChatInfoPanel from "../messaging/ChatInfoPanel";
import { mergeMessage, markMessageFailed, markReceipt, updateMessage, hideMessage, removePendingMessage, messagesInChronologicalOrder } from "../messaging/messageCache";

const chatFilters = [["inbox", "Inbox"], ["marketplace", "Marketplace"], ["groups", "Groups"], ["requests", "Requests"], ["archived", "Archived"]];

function NewChat({ onClose, onCreated }) {
  const [term,setTerm]=useState(""),[mode,setMode]=useState("direct"),[selected,setSelected]=useState([]),[groupName,setGroupName]=useState(""),[error,setError]=useState("");
  const search=useQuery({queryKey:["people","search",term],queryFn:()=>read("/users/search",{q:term}),enabled:term.trim().length>=2});
  const mutation=useMutation({mutationFn:async(userId)=>create("/conversations",mode==="direct"?{type:"direct",userId}:{type:"group",userIds:selected,name:groupName.trim()}),onSuccess:conversation=>{setError("");onCreated(conversation.id);},onError:e=>setError(errorText(e))});
  return <section className={`${panel} space-y-3`}><div className="flex items-center justify-between"><h2 className="font-bold">New conversation</h2><button onClick={onClose} aria-label="Close new conversation"><X size={18}/></button></div><Tabs value={mode} onChange={setMode} tabs={[["direct","Direct message"],["group","Group chat"]]}/><input className={field} value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search usernames" aria-label="Search users"/>
    <div className="max-h-48 overflow-y-auto">{search.isPending&&term.trim().length>=2 ? <p className="text-xs text-ink-soft">Searching...</p>:search.data?.map(u=><div key={u.id} className="flex items-center gap-2 border-b border-line py-2"><span className="min-w-0 flex-1 truncate text-sm text-ink">@{u.username}</span>{mode==="direct"?<button disabled={mutation.isPending} className={smallButton} onClick={()=>mutation.mutate(u.id)}>Message</button>:<label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={selected.includes(u.id)} onChange={e=>setSelected(p=>e.target.checked?[...p,u.id]:p.filter(id=>id!==u.id))}/> Invite</label>}</div>)}</div>
    {mode==="group" && <><p className="text-xs text-ink-soft">{selected.length} selected (at least 2 required)</p><input className={field} value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={80} placeholder="Group name"/><Button loading={mutation.isPending} disabled={selected.length<2||!groupName.trim()} onClick={()=>mutation.mutate()}>Create group and send invites</Button></>}
    <ErrorNotice error={error}/></section>;
}
function ConversationList({ tab, setTab, selectedId, onSelect, onCreate }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const debouncedSearch = useDebounce(search.trim(), 250);
  const list = useQuery({ queryKey: ["conversations", tab], queryFn: () => read("/conversations", { tab }) });
  const conversations = (list.data || []).filter((c) => {
    const term = debouncedSearch.toLowerCase();
    return !term || [c.name, c.lastPreview, ...(c.members || []).filter((m) => m.user?.id !== user?.id).map((m) => m.user?.username)].some((v) => String(v || "").toLowerCase().includes(term));
  });
  const currentLabel = chatFilters.find(([value]) => value === tab)?.[1] || "Inbox";
  const unread = (list.data || []).reduce((count, row) => count + (row.unread || (row.settings?.manuallyUnread ? 1 : 0)), 0);
  useEffect(() => {
    if (!filterOpen) return undefined;
    const onPointer = (event) => { if (!filterRef.current?.contains(event.target)) setFilterOpen(false); };
    const onEscape = (event) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onEscape);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onEscape); };
  }, [filterOpen]);
  const menuAction = async (conversation, payload) => {
    try {
      await update(`/conversations/${conversation.id}/settings`, payload);
      if (payload.manuallyUnread === false) await create(`/conversations/${conversation.id}/read`);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMenuId(null);
    } catch (cause) { setNotice(errorText(cause)); }
  };
  const emptyDescriptions = {
    inbox: "Start a direct conversation or find friends on Aevora.",
    marketplace: "No Marketplace conversations yet. Chats linked to Marketplace activities will appear here once available.",
    groups: "Start a group conversation to see it here.",
    requests: "New message requests will appear here until you accept them.",
    archived: "Archived chats will appear here.",
  };
  return <section aria-label="Conversations" className={`${panel} flex h-full min-h-0 flex-col overflow-hidden !p-3`}>
    <div className="mb-3 flex items-center justify-between gap-2 px-1">
      <div className="min-w-0"><h2 className="text-lg font-bold text-ink">Chats</h2><p className="truncate text-xs text-ink-soft">{currentLabel}{unread ? ` · ${unread} unread` : ""}</p></div>
      <div className="flex items-center gap-1.5">
        <div ref={filterRef} className="relative">
          <button type="button" aria-label="Filter conversations" aria-haspopup="menu" aria-expanded={filterOpen} title="Filter conversations" className={smallButton} onClick={() => setFilterOpen((value) => !value)}><ListFilter size={18}/></button>
          {filterOpen && <div role="menu" aria-label="Conversation filter" onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
            const elements = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')];
            const index = elements.indexOf(document.activeElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? elements.length - 1 : event.key === "ArrowDown" ? (index + 1) % elements.length : (index + elements.length - 1) % elements.length;
            event.preventDefault(); elements[next]?.focus();
          }} className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
            {chatFilters.map(([value, label]) => <button key={value} type="button" role="menuitemradio" aria-checked={tab === value} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-raised ${tab === value ? "bg-brand-soft font-bold text-brand-ink" : "text-ink"}`} onClick={() => { setTab(value); setMenuId(null); setSearch(""); setNotice(""); setFilterOpen(false); }}>{label}{tab === value && <span aria-hidden="true">✓</span>}</button>)}
          </div>}
        </div>
        <button type="button" aria-label="New conversation" title="New conversation" className="grid size-9 place-items-center rounded-xl bg-brand text-on-brand" onClick={() => setAdding((v) => !v)}><CirclePlus size={20}/></button>
      </div>
    </div>
    {adding && <div className="max-h-[45%] overflow-auto"><NewChat onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); onCreate(id); }}/></div>}
    <label className="relative mb-3 block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true"/>
      <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search conversations" placeholder={`Search ${currentLabel.toLowerCase()}...`} className={`${field} !pl-10`}/>
    </label>
    <ErrorNotice error={notice}/>
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto" aria-live="polite">
      {list.isPending ? <Loading label="Loading conversations..."/> : list.error ? <ErrorNotice error={list.error}/> : !conversations.length ? <Empty title={`No ${currentLabel.toLowerCase()} conversations`} description={debouncedSearch ? "No matching conversations. Try another search." : emptyDescriptions[tab]}/> : conversations.map((c) => <div key={c.id} className={`group relative mb-1 flex items-center rounded-xl ${selectedId === c.id ? "bg-brand-soft" : "hover:bg-raised"}`}>
        <button type="button" onClick={() => { setMenuId(null); onSelect(c.id); }} className="flex min-w-0 flex-1 items-center gap-3 p-2.5 text-left">
          <Avatar name={c.name} src={c.avatarId ? mediaFile(c.avatarId, true) : undefined}/>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{c.name || "Conversation"}</span><span className="block truncate text-xs text-ink-soft">{c.requestState === "pending" ? "Message request" : c.lastPreview || "No messages yet"}</span></span>
          <span className="flex flex-col items-end gap-1">{c.unread > 0 ? <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-on-brand">{c.unread}</span> : c.settings?.manuallyUnread ? <span className="size-2.5 rounded-full bg-brand" aria-label="Marked unread"/> : null}{c.settings?.pinned && <Pin size={12} className="text-brand-ink"/>}</span>
        </button>
        <div className="relative shrink-0 pr-2"><button type="button" aria-label={`More actions for ${c.name}`} aria-expanded={menuId === c.id} title="Conversation actions" className="rounded-lg p-1.5 text-ink-soft opacity-100 hover:bg-surface focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100" onClick={() => setMenuId((old) => old === c.id ? null : c.id)}><MoreHorizontal size={18}/></button>
          {menuId === c.id && <div role="menu" className="absolute right-0 top-full z-50 w-52 space-y-1 rounded-xl border border-line bg-surface p-2 text-sm shadow-xl">
            <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-raised" onClick={() => menuAction(c, { pinned: !c.settings?.pinned })}>{c.settings?.pinned ? "Unpin conversation" : "Pin conversation"}</button>
            <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-raised" onClick={() => menuAction(c, { manuallyUnread: !(c.settings?.manuallyUnread || c.unread > 0) })}>{c.settings?.manuallyUnread || c.unread > 0 ? "Mark as read" : "Mark as unread"}</button>
            <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-raised" onClick={() => menuAction(c, { muted: !c.settings?.muted })}>{c.settings?.muted ? "Unmute" : "Mute"}</button>
            <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-raised" onClick={() => menuAction(c, { archived: !c.settings?.archived })}>{c.settings?.archived ? "Unarchive" : "Archive conversation"}</button>
            <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-danger hover:bg-raised" onClick={() => { if (window.confirm("Remove this conversation from your inbox only?")) menuAction(c, { hidden: true }); }}>Delete conversation for me</button>
          </div>}
        </div>
      </div>)}
    </div>
    <Link to="/friends" className="mt-2 flex shrink-0 items-center gap-2 rounded-lg border-t border-line px-3 py-2 text-xs font-semibold text-brand-ink hover:bg-raised"><Users size={16}/> Manage friends and friend requests</Link>
  </section>;
}

function GroupSettings({ conversation, refresh }) {
  const [open,setOpen]=useState(false),[name,setName]=useState(conversation.name||""),[term,setTerm]=useState(""),[error,setError]=useState("");
  const {user}=useAuth();
  const me=conversation.members.find(m=>m.user?.id===user?.id);
  const admin=["owner","admin"].includes(me?.role);
  const search=useQuery({queryKey:["people","search",term],queryFn:()=>read("/users/search",{q:term}),enabled:term.length>=2&&open});
  const act=useAction(refresh);
  if(conversation.type!=="group")return null;
  return <div className="border-t border-line pt-2"><button className={smallButton} onClick={()=>setOpen(v=>!v)}>Group settings {open?"▲":"▼"}</button>{open&&<div className="mt-2 space-y-3 rounded-xl bg-raised p-3"><h3 className="font-semibold">Members</h3>{conversation.members.map(m=><div key={m.user?.id} className="flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate">@{m.user?.username||"Unknown"} ({m.role}, {m.accepted?"joined":m.requestState})</span>{admin&&m.user?.id!==user.id&&<div className="flex gap-1"><button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/conversations/${conversation.id}/members/${m.user.id}`,null,"delete")}>Remove</button>{me.role==="owner"&&<button className={smallButton} onClick={async()=>{try{await update(`/conversations/${conversation.id}/members/${m.user.id}`,{role:m.role==="admin"?"member":"admin"});refresh();}catch(e){setError(errorText(e));}}}>Admin</button>}</div>}</div>)}
    {admin&&<><MediaPicker purpose="avatar" label="Change group picture" accept="image/*" onReady={async(media)=>{if(!media)return;try{await update(`/conversations/${conversation.id}/group`,{avatarId:media.id});refresh();}catch(e){setError(errorText(e));}}}/><form onSubmit={async(e)=>{e.preventDefault();try{await update(`/conversations/${conversation.id}/group`,{name});refresh();}catch(e){setError(errorText(e));}}} className="flex gap-2"><input className={field} value={name} onChange={e=>setName(e.target.value)} maxLength={80}/><button className={smallButton} type="submit">Rename</button></form><label className="text-xs">Add a member<input className={`${field} mt-1`} value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search username"/></label>{search.data?.filter(x=>!conversation.members.some(m=>m.user?.id===x.id)).map(u=><div className="flex justify-between text-xs" key={u.id}><span>@{u.username}</span><button className={smallButton} onClick={()=>act.run(`/conversations/${conversation.id}/members`,{userId:u.id})}>Invite</button></div>)}</>}
    <button className={`${smallButton} text-danger`} onClick={()=>act.run(`/conversations/${conversation.id}/members/${user.id}`,null,"delete")}>Leave group</button><ErrorNotice error={error||act.error}/></div>}</div>;
}

function ConversationView({ id, onBack }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [socket, setSocket] = useState(getSocialSocket);
  useEffect(() => subscribeSocialSocket(setSocket), []);
  const parent = useRef(null);
  const scrollStick = useRef(true);
  const typingTimer = useRef(null);
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [reply, setReply] = useState(null);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(null);
  const typingExpiry = useRef(null);
  const [presence, setPresence] = useState(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [highlighted, setHighlighted] = useState(null);
  const chat = useQuery({ queryKey: ["conversations", id], queryFn: () => read(`/conversations/${id}`), enabled: Boolean(id) });
  const msgs = useInfiniteQuery({
    queryKey: ["messages", id], queryFn: async ({ pageParam }) => {
      const result = await read(`/conversations/${id}/messages`, { before: pageParam, limit: 40 });
      // Refetches must not erase messages still waiting for their HTTP acknowledgement.
      if (!pageParam) {
        const pending = (client.getQueryData(["messages", id])?.pages || []).flatMap((p) => p.items || []).filter((m) => String(m._id).startsWith("pending:"));
        const existingIds = new Set(result.items.map((m) => m.clientId));
        result.items = [...result.items, ...pending.filter((m) => !existingIds.has(m.clientId))];
      }
      return result;
    },
    initialPageParam: null, getNextPageParam: (last) => last?.nextCursor || undefined, enabled: Boolean(id),
  });
  const found = useQuery({ queryKey: ["messageSearch", id, search], queryFn: () => read(`/conversations/${id}/search`, { q: search }), enabled: searchOpen && search.trim().length >= 2 });
  const items = useMemo(() => messagesInChronologicalOrder(msgs.data), [msgs.data]);
  const virtual = useVirtualizer({
    count: items.length, getScrollElement: () => parent.current,
    estimateSize: () => 110, overscan: 8,
    getItemKey: (index) => items[index]?._id || index,
    measureElement: (element) => element.getBoundingClientRect().height,
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["conversations", id] }),
      client.invalidateQueries({ queryKey: ["conversations"] }),
      client.invalidateQueries({ queryKey: ["pinnedMessages", id] }),
      client.invalidateQueries({ queryKey: ["chatAttachments", id] }),
    ]);
  };
  const updateCached = (messageId, change) => client.setQueryData(["messages", id], (old) => updateMessage(old, messageId, change));
  const enqueueSend = (payload, previous = null) => {
    const optimistic = previous || {
      _id: `pending:${payload.clientId}`, clientId: payload.clientId, senderId: user.id, conversationId: id,
      kind: payload.kind || "text", text: payload.text || "", mediaIds: payload.mediaIds || [], gif: payload.gif,
      replyTo: payload.replyTo || null, createdAt: new Date().toISOString(), sendingState: "sending",
      deliveredTo: [user.id], readBy: [user.id], reactions: [], retryPayload: payload,
    };
    client.setQueryData(["messages", id], (old) => mergeMessage(old, { ...optimistic, sendingState: "sending", retryPayload: payload }));
    const work = async () => {
      try {
        const stored = await create(`/conversations/${id}/messages`, payload);
        client.setQueryData(["messages", id], (old) => mergeMessage(old, { ...stored, sendingState: undefined, retryPayload: undefined, localAttachments: undefined, uploadStage: undefined }));
        void client.invalidateQueries({ queryKey: ["conversations"] });
        return stored;
      } catch (cause) {
        client.setQueryData(["messages", id], (old) => markMessageFailed(old, payload.clientId));
        setError(`Message failed to send: ${errorText(cause)}. Your draft remains available in the composer.`);
        throw cause;
      }
    };
    // Each message has a unique clientId and atomic server persistence. Sending
    // concurrently prevents artificial queue delays when users type quickly.
    return work();
  };
  const beginDraftSend = ({ clientId, text: draftText, attachments = [], kind, replyTo }) => {
    // Optimistic bubble is visible as soon as Send is clicked, before media
    // optimization and ImageKit storage are complete. Recipients only see a
    // persisted message after all attachments are ready.
    client.setQueryData(["messages", id], (old) => mergeMessage(old, {
      _id: `pending:${clientId}`, clientId, senderId: user.id,
      conversationId: id, text: draftText, kind,
      localAttachments: attachments.map((item) => ({ key: item.key, url: item.url, kind: item.kind, name: item.file.name, size: item.file.size })),
      replyTo: replyTo || null, mediaIds: [], createdAt: new Date().toISOString(),
      sendingState: "sending", uploadStage: attachments.length ? "preparing" : "sending",
      deliveredTo: [user.id], readBy: [user.id], reactions: [],
    }));
  };
  const send = async (submission = {}) => {
    if (savingEdit || !chat.data?.members.some((member) => member.user?.id === user.id && member.accepted)) {
      throw new Error("You cannot send a message to this conversation right now.");
    }
    const draftText = submission.text ?? text;
    if (editing) {
      if (!draftText.trim()) throw new Error("Edited messages cannot be empty.");
      const previousText = editing.text;
      setSavingEdit(true); setError("");
      updateCached(editing._id, { text: draftText, editedAt: new Date().toISOString() });
      try {
        const saved = await update(`/messages/${editing._id}`, { text: draftText });
        client.setQueryData(["messages", id], (old) => mergeMessage(old, saved));
        setEditing(null);
      } catch (cause) {
        updateCached(editing._id, { text: previousText, editedAt: editing.editedAt });
        setError(errorText(cause));
        throw cause;
      } finally { setSavingEdit(false); }
      return;
    }
    const attachments = submission.attachments || [];
    const mediaIds = attachments.map((entry) => entry.id);
    if (!draftText.trim() && !mediaIds.length) throw new Error("Add text or an attachment to send.");
    const payload = {
      clientId: submission.clientId || uuidv4(), kind: submission.kind || "text",
      text: draftText, mediaIds,
      ...(submission.replyTo ? { replyTo: submission.replyTo } : {}),
    };
    setError("");
    getSocialSocket()?.emit("typing", { conversationId: id, active: false });
    await enqueueSend(payload);
  };
  const sendGif = (gif) => {
    const payload = { clientId: uuidv4(), kind: "gif", mediaIds: gif.source === "upload" ? [gif.mediaId] : [],
      ...(gif.source === "giphy" ? { gif: { source: "giphy", id: String(gif.id) } } : {}),
      ...(reply ? { replyTo: reply._id } : {}) };
    setReply(null); setError("");
    return enqueueSend(payload);
  };
  const retry = (message) => { if (message.retryPayload) void enqueueSend(message.retryPayload, message).catch(() => {}); };
  const cancelEdit = () => { setEditing(null); setText(""); };
  const beginEdit = (message) => { setReply(null); setEditing(message); setText(message.text || ""); };
  const reportMessage = async (messageId) => {
    const reason = window.prompt("Why are you reporting this message? (minimum 8 characters)");
    if (!reason?.trim()) return;
    try { await create("/reports", { targetType: "message", targetId: messageId, reason }); setError("Your report has been submitted."); }
    catch (cause) { setError(errorText(cause)); }
  };
  const react = async (messageId, emoji) => {
    const old = items.find((m) => m._id === messageId);
    if (!old) return;
    const previous = old.reactions || [];
    const next = previous.filter((r) => r.userId !== user.id);
    if (emoji) next.push({ userId: user.id, emoji });
    updateCached(messageId, { reactions: next });
    try {
      const updated = emoji ? await create(`/messages/${messageId}/reactions`, { emoji }) : await remove(`/messages/${messageId}/reactions`);
      client.setQueryData(["messages", id], (cache) => mergeMessage(cache, updated));
    } catch (cause) { updateCached(messageId, { reactions: previous }); throw cause; }
  };
  const deleteAll = async (msg) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    const tombstone = { text: "", mediaIds: [], gif: undefined, reactions: [], pinnedAt: null, deletedAt: new Date().toISOString() };
    updateCached(msg._id, tombstone);
    try { await remove(`/messages/${msg._id}`); await refresh(); }
    catch (cause) { updateCached(msg._id, msg); setError(errorText(cause)); }
  };
  const deleteMine = async (msg) => {
    if (!window.confirm("Remove this message from your view? Others can still see it.")) return;
    client.setQueryData(["messages", id], (old) => hideMessage(old, msg._id));
    try { await remove(`/messages/${msg._id}/me`); await refresh(); }
    catch (cause) { client.setQueryData(["messages", id], (old) => mergeMessage(old, msg)); setError(errorText(cause)); }
  };
  const pin = async (msg) => {
    const want = !msg.pinnedAt;
    updateCached(msg._id, { pinnedAt: want ? new Date().toISOString() : null });
    try { await update(`/messages/${msg._id}/pin`, { pinned: want }); await refresh(); }
    catch (cause) { updateCached(msg._id, { pinnedAt: msg.pinnedAt }); setError(errorText(cause)); }
  };
  const jump = async (messageId) => {
    setError("");
    const has = items.some((msg) => msg._id === messageId);
    if (!has) try {
      const context = await read(`/conversations/${id}/messages/around/${messageId}`);
      for (const item of context) client.setQueryData(["messages", id], (old) => mergeMessage(old, item));
    } catch (cause) { setError(errorText(cause)); return; }
    setHighlighted(messageId);
    // Message virtualization needs a render pass after the context is added.
    setTimeout(() => {
      const pages = client.getQueryData(["messages", id]);
      const index = messagesInChronologicalOrder(pages).findIndex((msg) => msg._id === messageId);
      if (index >= 0) virtual.scrollToIndex(index, { align: "center" });
    }, 30);
    setTimeout(() => setHighlighted((now) => now === messageId ? null : now), 3000);
  };
  const onTyping = (active) => {
    const socket = getSocialSocket();
    if (!socket) return;
    clearTimeout(typingTimer.current);
    socket.emit("typing", { conversationId: id, active });
    if (active) typingTimer.current = setTimeout(() => socket.emit("typing", { conversationId: id, active: false }), 1400);
  };
  useEffect(() => () => { clearTimeout(typingTimer.current); }, []);
  const needAck = items.filter((msg) => msg.senderId !== user?.id && !msg.deliveredTo?.includes(user?.id) && !msg.deletedAt).slice(-80).map((msg) => msg._id).join(",");
  const latestIncoming = [...items].reverse().find((msg) => msg.senderId !== user?.id && !msg.deletedAt)?._id || "";
  useEffect(() => {
    if (!items.length || !chat.data?.members.some((member) => member.user?.id === user?.id && member.accepted)) return;
    if (socket?.connected && needAck) socket.emit("message:delivered", { conversationId: id, messageIds: needAck.split(",") }, (result) => {
      if (result?.ok) client.setQueryData(["messages", id], (cache) => needAck.split(",").reduce((acc, messageId) => markReceipt(acc, { type: "delivery", messageId, userId: user.id }), cache));
    });
  }, [id, user?.id, chat.data?.id, needAck, socket]);
  useEffect(() => {
    if (!msgs.data || !chat.data?.members.some((member) => member.user?.id === user?.id && member.accepted)) return undefined;
    const markRead = () => { if (document.visibilityState === "visible" && document.hasFocus()) create(`/conversations/${id}/read`).catch((e) => console.warn("Could not update read receipt", e)); };
    const timer = setTimeout(markRead, 250);
    document.addEventListener("visibilitychange", markRead);
    window.addEventListener("focus", markRead);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", markRead); window.removeEventListener("focus", markRead); };
  }, [id, user?.id, chat.data?.id, latestIncoming]);
  useEffect(() => {
    if (!items.length) return;
    if (scrollStick.current || items[items.length - 1].senderId === user?.id) virtual.scrollToIndex(items.length - 1, { align: "end" });
  }, [id, items.length, user?.id]);
  useEffect(() => {
    if (!socket) return undefined;
    const event = (payload) => {
      if (payload.conversationId !== id || payload.userId === user?.id) return;
      clearTimeout(typingExpiry.current);
      setTyping(payload.active ? payload.userId : null);
      if (payload.active) typingExpiry.current = setTimeout(() => setTyping(null), 3000);
    };
    socket.on("typing", event);
    return () => { clearTimeout(typingExpiry.current); socket.off("typing", event); };
  }, [id, user?.id, chat.data?.id, socket]);
  useEffect(() => {
    const peer = chat.data?.members.find((member) => member.user?.id !== user?.id)?.user;
    if (!socket || !peer || chat.data?.type !== "direct") return undefined;
    const refreshPresence = () => socket.emit("presence:query", { userId: peer.id }, setPresence);
    const changed = (payload) => { if (payload?.userId === peer.id) refreshPresence(); };
    if (socket.connected) refreshPresence();
    socket.on("connect", refreshPresence);
    socket.on("presence:changed", changed);
    return () => { socket.off("connect", refreshPresence); socket.off("presence:changed", changed); };
  }, [id, chat.data?.id, user?.id, socket]);
  const conversationAction = async (payload) => {
    try { await update(`/conversations/${id}/settings`, payload); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
  };
  const respond = async (decision) => {
    try { await create(`/conversations/${id}/respond`, { action: decision }); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
  };
  if (chat.isPending) return <Loading label="Opening chat..."/>;
  if (chat.error) return <ErrorNotice error={chat.error}/>;
  const c = chat.data;
  const me = c.members.find((member) => member.user?.id === user?.id);
  const peer = c.members.find((member) => member.user?.id !== user?.id)?.user;
  const peerName = c.type === "group" ? c.name : (c.nicknames?.find((row) => row.userId === peer?.id)?.value || c.name);
  const status = typing ? "Typing..." : c.type === "group" ? `${c.members.length} members` : presence?.visible ? presence.online ? "Active now" : presence.lastActiveAt ? (() => { const min = Math.max(1, Math.floor((Date.now() - new Date(presence.lastActiveAt)) / 60000)); return min < 60 ? `Active ${min} min ago` : "Offline"; })() : "Offline" : "Activity hidden";
  return <div className="relative flex h-full min-h-0 w-full overflow-hidden rounded-2xl border border-line bg-surface">
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-3 sm:px-4">
        <button type="button" className="lg:hidden" aria-label="Back to conversations" onClick={onBack}><ArrowLeft size={20}/></button>
        <Avatar size="sm" name={peerName} src={c.type === "group" ? (c.avatarId ? mediaFile(c.avatarId, true) : undefined) : peer?.image}/>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setShowInfo(true)} aria-label="Open chat information"><h2 className="truncate text-sm font-bold text-ink">{peerName}</h2><p className="text-xs text-ink-soft">{status}</p></button>
        <button type="button" aria-label="Search messages" title="Search messages" className={smallButton} onClick={() => setSearchOpen((v) => !v)}><Search size={18}/></button>
        <button type="button" title="Chat details" aria-label="Open chat details" className={smallButton} onClick={() => setShowInfo((v) => !v)}><Info size={19}/></button>
      </header>
      {searchOpen && <div className="border-b border-line p-3"><input autoFocus className={field} placeholder="Search text in this chat" value={search} onChange={(e) => setSearch(e.target.value)}/>{found.isPending && search.length >= 2 && <p className="text-xs text-ink-soft">Searching...</p>}{found.data?.length > 0 && <div className="max-h-32 overflow-y-auto">{found.data.map((msg) => <button key={msg._id} type="button" onClick={() => jump(msg._id)} className="block w-full truncate border-b border-line py-1 text-left text-xs hover:bg-raised">{msg.text}</button>)}</div>}</div>}
      {me.requestState === "pending" && <div className="flex flex-wrap gap-2 border-b border-line bg-brand-soft p-3 text-xs"><span className="w-full">{c.type === "group" ? "Group invitation" : "Message request. Accept to reply."}</span><button className={smallButton} onClick={() => respond("accept")}>Accept</button><button className={smallButton} onClick={() => respond("reject")}>Reject</button></div>}
      <div ref={parent} onScroll={(event) => { const el = event.currentTarget; scrollStick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160; }} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-canvas px-3 py-3 sm:px-4">
        {msgs.hasNextPage && <div className="mb-3 text-center"><button className={smallButton} disabled={msgs.isFetchingNextPage} onClick={() => msgs.fetchNextPage()}>{msgs.isFetchingNextPage ? "Loading..." : "Load older messages"}</button></div>}
        {msgs.isPending ? <Loading label="Loading messages..."/> : msgs.error ? <ErrorNotice error={msgs.error}/> : !items.length ? <p className="py-12 text-center text-sm text-ink-soft">No messages yet. Say hello.</p>
          : <div style={{ height: `${virtual.getTotalSize()}px`, position: "relative" }}>
            {virtual.getVirtualItems().map((row) => <div key={items[row.index]?._id} data-index={row.index} ref={virtual.measureElement} style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }} className="pb-2 hover:z-30 focus-within:z-30">
              <ChatMessage message={items[row.index]} previous={items[row.index - 1]} next={items[row.index + 1]} conversation={c} userId={user.id} highlighted={highlighted === items[row.index]?._id} onReply={setReply} onEdit={beginEdit} onReact={react} onDelete={deleteAll} onDeleteMe={deleteMine} onPin={pin} onReport={reportMessage} onRetry={retry} onJump={jump}/>
            </div>)}
          </div>}
      </div>
      {me?.accepted && <ChatComposer key={id} text={text} setText={setText} media={media} setMedia={setMedia}
        onSendStart={beginDraftSend}
        onSendProgress={({ clientId, stage, percent }) => updateCached(`pending:${clientId}`, { uploadStage: stage, uploadPercent: percent })}
        onSendFailure={({ clientId }) => client.setQueryData(["messages", id], (cache) => removePendingMessage(cache, clientId))}
        quickEmoji={c.quickEmoji || "👍"} onQuickEmoji={() => {
        if (savingEdit) return;
        setError("");
        void enqueueSend({ clientId: uuidv4(), kind: "text", text: c.quickEmoji || "👍", mediaIds: [], ...(reply ? { replyTo: reply._id } : {}) }).catch(() => {});
        setReply(null);
      }} reply={reply} cancelReply={() => setReply(null)} editing={editing} cancelEditing={cancelEdit} onSubmit={send} onGif={sendGif} onTyping={onTyping} busy={savingEdit}/>}
      {c.type === "group" && <div className="max-h-48 overflow-auto px-3 pb-2"><GroupSettings conversation={c} refresh={refresh}/></div>}
      {error && <div className="border-t border-line px-3 py-2"><ErrorNotice error={error}/><button type="button" className="mt-1 text-xs underline" onClick={() => setError("")}>Dismiss</button></div>}
    </section>
    {showInfo && <div className="absolute inset-y-0 right-0 z-40 w-full shadow-2xl sm:w-[335px] 2xl:relative 2xl:shadow-none">
      <ChatInfoPanel conversation={c} me={me} peer={peer} presence={presence} typing={typing} recentMessages={items} onChange={refresh} onSearch={() => { setSearchOpen(true); setShowInfo(false); }} onJump={jump} onClose={() => setShowInfo(false)}/>
    </div>}
  </div>;
}
export default function MessagesPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const getFilter = () => {
    if (location.pathname === "/message-requests") return "requests";
    const fromUrl = new URLSearchParams(location.search).get("filter");
    return chatFilters.some(([key]) => key === fromUrl) ? fromUrl : "inbox";
  };
  const [tab, setTab] = useState(getFilter);
  useEffect(() => { setTab(getFilter()); }, [location.pathname, location.search]);
  const filterSuffix = tab === "inbox" ? "" : `?filter=${encodeURIComponent(tab)}`;
  const switchFilter = (value) => {
    setTab(value);
    const suffix = value === "inbox" ? "" : `?filter=${encodeURIComponent(value)}`;
    nav(`${location.pathname === "/message-requests" ? "/messages" : location.pathname}${suffix}`, { replace: true });
  };
  return <div className="grid min-h-0 w-full flex-1 gap-3 lg:grid-cols-[minmax(275px,335px)_minmax(0,1fr)] lg:gap-4">
    <div className={`min-h-0 ${id ? "hidden lg:block" : "block"}`}><ConversationList tab={tab} setTab={switchFilter} selectedId={id} onSelect={(target) => nav(`/messages/${target}${filterSuffix}`)} onCreate={(target) => nav(`/messages/${target}${filterSuffix}`)}/></div>
    <div className={`min-h-0 ${id ? "block" : "hidden lg:block"}`}>{id ? <ConversationView key={id} id={id} onBack={() => nav(`/messages${filterSuffix}`)}/> : <section className={`${panel} flex h-full flex-col items-center justify-center text-center`}><MessageCircle className="size-14 text-brand-ink"/><h2 className="mt-4 text-xl font-bold">Your conversations</h2><p className="mt-1 text-sm text-ink-soft">Select a chat, open your friends list, or start a new conversation.</p></section>}</div>
  </div>;
}
