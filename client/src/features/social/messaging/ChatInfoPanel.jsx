import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell, BellOff, ChevronDown, ChevronUp, Clock, Eye, FileText, Flag, Image, Link2,
  LockKeyhole, MessageSquareText, Palette, Pin, Search, Smile, UserRound, UserX, Users, X,
} from "lucide-react";
import Avatar from "../../../components/ui/Avatar";
import EmojiPicker from "../../../components/common/EmojiPicker";
import { create, errorText, mediaFile, read, update } from "../api/socialApi";
import { ErrorNotice, field, smallButton } from "../components/SocialUI";

const sectionTitle = "flex w-full items-center justify-between py-2.5 text-left text-sm font-bold text-ink";
const itemButton = "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-ink hover:bg-raised";
function Section({ title, children, initial = true }) {
  const [open, setOpen] = useState(initial);
  return <section className="border-b border-line pb-2"><button type="button" aria-expanded={open} className={sectionTitle} onClick={() => setOpen((value) => !value)}>{title}{open ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}</button>{open && <div className="space-y-1">{children}</div>}</section>;
}
const presenceText = (presence, typing) => {
  if (typing) return "Typing...";
  if (!presence || !presence.visible) return "Activity status hidden";
  if (presence.online) return "Active now";
  if (!presence.lastActiveAt) return "Offline";
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(presence.lastActiveAt)) / 60000));
  return minutes < 60 ? `Active ${minutes} minutes ago` : minutes < 1440 ? `Active ${Math.floor(minutes / 60)} hours ago` : "Offline";
};

export default function ChatInfoPanel({ conversation, me, peer, presence, typing, recentMessages, onChange, onJump, onSearch, onClose }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const emojiAnchor = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [contentType, setContentType] = useState(null);
  const [nicknamesOpen, setNicknamesOpen] = useState(false);
  const [nicknames, setNicknames] = useState({});
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("Harassment or bullying");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const canCustomize = conversation.type === "direct" || ["owner", "admin"].includes(me?.role);
  const displayName = conversation.type === "direct" ? peer?.name || peer?.username : conversation.name;
  useEffect(() => { setNicknames(Object.fromEntries(conversation.nicknames?.map((n) => [n.userId, n.value]) || [])); }, [conversation.id, conversation.nicknames]);
  const pinned = useQuery({ queryKey: ["pinnedMessages", conversation.id], queryFn: () => read(`/conversations/${conversation.id}/pinned`), enabled: pinnedOpen });
  const content = useQuery({ queryKey: ["chatAttachments", conversation.id, contentType], queryFn: () => read(`/conversations/${conversation.id}/attachments`, { type: contentType }), enabled: Boolean(contentType) });
  const privacy = useQuery({ queryKey: ["privacy"], queryFn: () => read("/privacy") });
  const save = async (payload) => {
    setError(""); setNotice(""); setSaving(true);
    const oldChat = client.getQueryData(["conversations", conversation.id]);
    // Show a newly selected chat emoji immediately beside the composer; restore
    // the previous value if the server rejects the update.
    if (payload.quickEmoji) client.setQueryData(["conversations", conversation.id], (previous) => previous && { ...previous, quickEmoji: payload.quickEmoji });
    try { await update(`/conversations/${conversation.id}/customize`, payload); await onChange(); setNotice("Chat settings updated."); }
    catch (cause) {
      if (payload.quickEmoji && oldChat) client.setQueryData(["conversations", conversation.id], oldChat);
      setError(errorText(cause));
    } finally { setSaving(false); }
  };
  const readReceipt = async (visibility) => {
    setSaving(true); setError("");
    try { await update("/privacy", { readReceiptsVisibility: visibility }); await client.invalidateQueries({ queryKey: ["privacy"] }); setNotice("Read receipt preference saved."); }
    catch (cause) { setError(errorText(cause)); }
    finally { setSaving(false); }
  };
  const toggleMute = async () => {
    setSaving(true); setError("");
    try { await update(`/conversations/${conversation.id}/settings`, { muted: !conversation.settings?.muted }); await onChange(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setSaving(false); }
  };
  const submitSafety = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (modal === "block") {
        if (!peer) throw new Error("You can only block an individual account.");
        await create(`/blocks/${peer.id}`);
        navigate("/messages");
      } else if (modal === "report") {
        await create("/reports", { targetType: "conversation", targetId: conversation.id, reason, description: description.trim(), messageIds: evidence });
        setNotice("Your report was submitted to moderators.");
      }
      setModal(null);
    } catch (cause) { setError(errorText(cause)); }
    finally { setSaving(false); }
  };
  const linkedMessages = content.data || [];
  return <aside className="custom-scrollbar relative flex h-full min-h-0 w-full flex-col overflow-y-auto border-l border-line bg-surface px-4 pb-5 text-ink sm:w-[335px] sm:shrink-0" aria-label="Chat information">
    <header className="sticky top-0 z-20 -mx-4 mb-3 flex items-center justify-between border-b border-line bg-surface px-4 py-3"><h2 className="font-bold">Chat details</h2><button type="button" aria-label="Close chat details" className={smallButton} onClick={onClose}><X size={18}/></button></header>
    <div className="mb-4 flex flex-col items-center gap-2 pt-2 text-center"><Avatar name={displayName} src={conversation.type === "group" ? (conversation.avatarId ? mediaFile(conversation.avatarId, true) : undefined) : peer?.image} size="lg"/><h3 className="text-base font-bold">{displayName}</h3><p className="text-xs text-ink-soft">{conversation.type === "group" ? `${conversation.members.length} participants` : presenceText(presence, typing)}</p><div className="mt-2 flex gap-5 text-xs">
      {conversation.type === "direct" && peer && <Link className="flex flex-col items-center gap-1 hover:text-brand-ink" to={`/u/${peer.username}`}><UserRound className="rounded-full bg-raised p-2" size={35}/>Profile</Link>}
      <button type="button" onClick={toggleMute} disabled={saving} className="flex flex-col items-center gap-1 hover:text-brand-ink">{conversation.settings?.muted ? <Bell className="rounded-full bg-raised p-2" size={35}/> : <BellOff className="rounded-full bg-raised p-2" size={35}/>} {conversation.settings?.muted ? "Unmute" : "Mute"}</button>
      <button type="button" onClick={onSearch} className="flex flex-col items-center gap-1 hover:text-brand-ink"><Search className="rounded-full bg-raised p-2" size={35}/>Search</button>
    </div></div>
    <ErrorNotice error={error}/>{notice && <p role="status" className="mb-2 text-xs text-success">{notice}</p>}
    <Section title="Chat info">
      <button type="button" className={itemButton} onClick={() => setPinnedOpen((v) => !v)}><Pin size={18}/> View pinned messages <span className="ml-auto">{pinnedOpen ? "▴" : "▾"}</span></button>
      {pinnedOpen && <div className="max-h-48 overflow-auto rounded-lg border border-line bg-canvas p-2">{pinned.isLoading ? <p className="text-xs text-ink-soft">Loading pins...</p> : pinned.error ? <ErrorNotice error={pinned.error}/> : !pinned.data?.length ? <p className="text-xs text-ink-soft">No messages pinned.</p> : pinned.data.map((message) => <button type="button" key={message._id} className="block w-full truncate rounded-md p-2 text-left text-xs hover:bg-raised" onClick={() => { onJump(message._id); onClose(); }}>{message.text || (message.gif ? "GIF" : "Attachment")} <span className="text-ink-faint">↗</span></button>)}</div>}
      <button type="button" className={itemButton} onClick={onSearch}><Search size={18}/> Search conversation</button>
    </Section>
    <Section title="Customize chat">
      <label className={`${itemButton} flex-wrap gap-2`}><Palette size={18}/> Change theme
        <select aria-label="Chat theme" disabled={!canCustomize || saving} value={conversation.theme || "default"} onChange={(event) => save({ theme: event.target.value })} className={`${field} ml-auto w-32 !py-1.5 text-xs`}>{["default", "blue", "violet", "emerald", "rose"].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select>
      </label>
      <div className="relative"><button type="button" ref={emojiAnchor} className={itemButton} disabled={!canCustomize || saving} onClick={() => setEmojiOpen((v) => !v)}><Smile size={18}/> Change chat emoji <span className="ml-auto text-lg">{conversation.quickEmoji || "👍"}</span></button><EmojiPicker open={emojiOpen} anchorRef={emojiAnchor} onClose={() => setEmojiOpen(false)} onSelect={(emoji) => { setEmojiOpen(false); void save({ quickEmoji: emoji }); }}/></div>
      {conversation.quickEmoji && conversation.quickEmoji !== "👍" && <button type="button" className="ml-8 text-xs text-brand-ink underline" disabled={!canCustomize || saving} onClick={() => void save({ quickEmoji: "👍" })}>Restore default 👍 emoji</button>}
      <button type="button" className={itemButton} onClick={() => setNicknamesOpen((v) => !v)}><Users size={18}/> Edit nicknames <span className="ml-auto">{nicknamesOpen ? "▴" : "▾"}</span></button>
      {nicknamesOpen && <div className="space-y-2 rounded-lg border border-line p-2">{conversation.members.map((member) => <label key={member.user?.id} className="block text-xs text-ink-soft">{member.user?.name || "Member"}<div className="mt-1 flex gap-1"><input value={nicknames[member.user?.id] ?? ""} maxLength={40} onChange={(event) => setNicknames((prev) => ({ ...prev, [member.user?.id]: event.target.value }))} placeholder="Nickname" className={field}/><button type="button" className={smallButton} disabled={saving} onClick={() => save({ nickname: { userId: member.user.id, value: nicknames[member.user.id] || "" } })}>Save</button></div></label>)}</div>}
    </Section>
    <Section title="Media & files">
      {[["media", <Image size={18}/>, "Media"], ["files", <FileText size={18}/>, "Files"], ["links", <Link2 size={18}/>, "Shared links"]].map(([value, icon, label]) => <button key={value} type="button" className={itemButton} onClick={() => setContentType((old) => old === value ? null : value)}>{icon} {label} <span className="ml-auto">{contentType === value ? "▴" : "▾"}</span></button>)}
      {contentType && <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-line bg-canvas p-2">
        {content.isLoading ? <p className="text-xs text-ink-soft">Loading shared {contentType}...</p> : content.error ? <ErrorNotice error={content.error}/> : !linkedMessages.length ? <p className="text-xs text-ink-soft">Nothing shared yet.</p> : linkedMessages.map((message) => <div key={message._id} className="rounded-lg border border-line p-2 text-xs">
          {contentType === "links" ? (message.text?.match(/https?:\/\/[^\s<>"']+/g) || []).slice(0, 3).map((url) => <a key={url} href={url} rel="noreferrer noopener" target="_blank" className="block break-all text-brand-ink underline">{url}</a>)
            : (message.attachments || []).map((media) => <a key={media.id} href={mediaFile(media.id)} className="flex items-center gap-2 hover:text-brand-ink" download>{media.kind !== "file" && <img src={mediaFile(media.id, true)} alt="Attachment thumbnail" loading="lazy" className="size-10 rounded object-cover"/>}<span className="min-w-0 truncate">{media.name || "Attachment"}</span></a>)}
          <button type="button" onClick={() => { onJump(message._id); onClose(); }} className="mt-1 text-brand-ink underline">View in chat</button>
        </div>)}
      </div>}
    </Section>
    <Section title="Privacy & support">
      <button type="button" className={itemButton} disabled={saving} onClick={toggleMute}>{conversation.settings?.muted ? <Bell size={18}/> : <BellOff size={18}/>} {conversation.settings?.muted ? "Unmute notifications" : "Mute notifications"}</button>
      <Link to="/privacy-safety" className={itemButton}><LockKeyhole size={18}/> Message permissions</Link>
      <label className={`${itemButton} flex-wrap gap-2`}><Clock size={18}/> Disappearing messages
        <select aria-label="Disappearing messages" disabled={!canCustomize || saving} value={conversation.disappearingSeconds || 0} onChange={(event) => save({ disappearingSeconds: Number(event.target.value) })} className={`${field} ml-auto w-32 !py-1.5 text-xs`}><option value={0}>Off</option><option value={86400}>24 hours</option><option value={604800}>7 days</option><option value={2592000}>30 days</option></select>
      </label>
      <label className={`${itemButton} flex-wrap gap-2`}><Eye size={18}/> Read receipts
        <select aria-label="Who can see my read receipts" disabled={saving || privacy.isLoading} value={privacy.data?.readReceiptsVisibility || "friends"} onChange={(event) => readReceipt(event.target.value)} className={`${field} ml-auto w-32 !py-1.5 text-xs`}><option value="everyone">Everyone</option><option value="friends">Friends</option><option value="nobody">Nobody</option></select>
      </label>
    </Section>
    <div className="mt-5 space-y-1 rounded-xl border border-danger/30 bg-danger/5 p-2" aria-label="Safety actions">
      {peer && <button type="button" className={`${itemButton} !text-danger`} onClick={() => { setModal("block"); setError(""); }}><UserX size={18}/> Block user</button>}
      <button type="button" className={`${itemButton} !text-danger`} onClick={() => { setModal("report"); setError(""); }}><Flag size={18}/> Report conversation</button>
    </div>
    {modal && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setModal(null); }}><form onSubmit={submitSafety} role="dialog" aria-modal="true" aria-label={modal === "block" ? "Block user" : "Report conversation"} className="w-full max-w-md space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-2xl">
      <h3 className="text-lg font-bold">{modal === "block" ? `Block @${peer?.username}?` : "Report conversation"}</h3>
      {modal === "block" ? <p className="text-sm text-ink-soft">Blocking prevents this account from messaging, following, or sending friend requests to you. You can unblock them in Privacy & Safety.</p> : <>
        <label className="block text-sm font-semibold">Reason<select required value={reason} onChange={(event) => setReason(event.target.value)} className={`${field} mt-1`}><option>Harassment or bullying</option><option>Spam or scam messages</option><option>Threats or violence</option><option>Hate or discrimination</option><option>Other inappropriate conduct</option></select></label>
        <label className="block text-sm font-semibold">Description (optional)<textarea className={`${field} mt-1 resize-none`} maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Additional context for moderators"/></label>
        <p className="text-xs font-semibold">Include recent messages as evidence (up to 5)</p>
        <div className="max-h-28 space-y-1 overflow-y-auto">{recentMessages.filter((m) => !m.deletedAt && !String(m._id).startsWith("pending:")).slice(-15).reverse().map((m) => <label key={m._id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={evidence.includes(m._id)} disabled={evidence.length >= 5 && !evidence.includes(m._id)} onChange={(event) => setEvidence((arr) => event.target.checked ? [...arr, m._id] : arr.filter((id) => id !== m._id))}/><span className="truncate">{m.text?.slice(0, 90) || "Attachment"}</span></label>)}</div>
      </>}
      <ErrorNotice error={error}/>
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} className={smallButton} onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Processing..." : modal === "block" ? "Block user" : "Submit report"}</button></div>
    </form></div>}
  </aside>;
}
