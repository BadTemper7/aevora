import { Copy, Edit3, EyeOff, Flag, LoaderCircle, MoreHorizontal, Pin, PinOff, Reply, SmilePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { REACTION_OPTIONS, nextReaction } from "./reactionOptions";
import EmojiPicker from "../../../components/common/EmojiPicker";

const QUICK_REACTIONS = REACTION_OPTIONS.slice(0, 4);
const iconButton = "grid size-8 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";

export function MessageActions({ message, currentUserId, isMine, quickEmoji, canPin = true, canDeleteEveryone = isMine, openRequest = 0, onReact, onReply, onCopy, onEdit, onDelete, onDeleteMe, onPin, onReport }) {
  const rootRef = useRef(null);
  const pickerButtonRef = useRef(null);
  const pendingRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const myReaction = message.reactions?.find((reaction) => reaction.userId === currentUserId)?.emoji;
  const visibleReactions = useMemo(() => {
    const extras = quickEmoji ? [{ emoji: quickEmoji, label: "Chat reaction" }] : [];
    return [...extras, ...QUICK_REACTIONS].filter((item, index, all) => all.findIndex((value) => value.emoji === item.emoji) === index).slice(0, 4);
  }, [quickEmoji]);

  useEffect(() => { if (openRequest > 0) setTouchOpen(true); }, [openRequest]);

  useEffect(() => {
    if (!pickerOpen && !menuOpen && !touchOpen) return undefined;
    const closeOutside = (event) => {
      // The full emoji picker is portaled to document.body, outside rootRef.
      // Do not unmount it before its emoji button receives the click.
      if (!rootRef.current?.contains(event.target) && !event.target?.closest?.("[data-emoji-picker-root]")) {
        setPickerOpen(false);
        setMenuOpen(false);
        setTouchOpen(false);
      }
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
        setMenuOpen(false);
        setTouchOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [pickerOpen, menuOpen, touchOpen]);

  const react = async (emoji) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    setPickerOpen(false);
    setTouchOpen(false);
    try {
      // One reaction per person per message. Clicking your reaction again removes it.
      const chosen = nextReaction(myReaction, emoji);
      if (chosen === undefined) throw new Error("Please select a valid emoji.");
      await onReact(message._id, chosen);
    } catch (cause) {
      setError(cause?.message || "Could not update your reaction. Please retry.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const runAction = (callback) => {
    setMenuOpen(false);
    setTouchOpen(false);
    callback();
  };

  if (message.deletedAt || String(message._id).startsWith("pending:")) return null;

  return <div ref={rootRef} className={`absolute top-0 z-30 ${isMine ? "right-1" : "left-1"}`}>
    {/* Touch devices have no hover: only this compact trigger stays visible. */}
    <button type="button" title="Message reactions and actions" aria-label="Show message reactions and actions" aria-expanded={touchOpen} onClick={() => { setTouchOpen((open) => !open); setPickerOpen(false); setMenuOpen(false); }} className="hidden size-8 place-items-center rounded-full border border-line bg-surface text-ink shadow-sm [@media(hover:none)]:grid"><SmilePlus size={17}/></button>
    <div role="toolbar" aria-label="Message reactions and actions" className={`flex max-w-max items-center gap-0.5 rounded-xl border border-line bg-surface px-1 py-0.5 text-ink shadow-lg transition-opacity duration-150 ${pickerOpen || menuOpen || touchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 [@media(hover:hover)]:group-hover/message:pointer-events-auto [@media(hover:hover)]:group-hover/message:opacity-100 [@media(hover:hover)]:group-focus-within/message:pointer-events-auto [@media(hover:hover)]:group-focus-within/message:opacity-100"} ${touchOpen ? "absolute top-0 z-40" : ""}`}>
      {visibleReactions.map(({ emoji, label }) => <button key={emoji} type="button" aria-label={`React ${label}`} aria-pressed={myReaction === emoji} title={label} disabled={pending} onClick={() => react(emoji)} className={`grid size-8 shrink-0 place-items-center rounded-lg text-lg leading-none transition-all hover:-translate-y-0.5 hover:bg-raised focus-visible:outline-2 focus-visible:outline-brand ${myReaction === emoji ? "bg-brand-soft ring-1 ring-brand" : ""}`}>{emoji}</button>)}
      <div className="relative">
        <button
          ref={pickerButtonRef}
          type="button"
          aria-label="Add reaction"
          title="Add reaction"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          disabled={pending}
          onClick={() => { setPickerOpen((open) => !open); setMenuOpen(false); }}
          className={iconButton}
        >{pending ? <LoaderCircle size={17} className="animate-spin" /> : <SmilePlus size={18}/>}</button>
        <EmojiPicker
          open={pickerOpen}
          anchorRef={pickerButtonRef}
          label="Choose a message reaction"
          onClose={() => setPickerOpen(false)}
          onSelect={(emoji) => react(emoji)}
        />
      </div>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
      <button type="button" className={iconButton} title="Reply" aria-label="Reply to message" onClick={() => runAction(onReply)}><Reply size={17}/></button>
      <div className="relative">
        <button type="button" className={iconButton} title="More message options" aria-label="More message options" aria-expanded={menuOpen} onClick={() => { setMenuOpen((open) => !open); setPickerOpen(false); }}><MoreHorizontal size={19}/></button>
        {menuOpen && <div role="menu" aria-label="Message options" className={`absolute top-full z-50 mt-2 min-w-40 rounded-xl border border-line bg-surface p-1.5 text-sm text-ink shadow-xl ${isMine ? "right-0" : "left-0"}`}>
          {message.text && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onCopy)}><Copy size={15}/> Copy text</button>}
          {isMine && message.text && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onEdit)}><Edit3 size={15}/> Edit message</button>}
          {canPin && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onPin)}>{message.pinnedAt ? <PinOff size={15}/> : <Pin size={15}/>} {message.pinnedAt ? "Unpin message" : "Pin message"}</button>}
          <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onDeleteMe)}><EyeOff size={15}/> Delete for Me</button>
          {canDeleteEveryone && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-danger hover:bg-raised" onClick={() => runAction(onDelete)}><Trash2 size={15}/> Delete for Everyone</button>}
          {!isMine && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onReport)}><Flag size={15}/> Report</button>}
        </div>}
      </div>
    </div>
    {error && <p role="alert" className="absolute top-full z-30 mt-1 w-56 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-danger shadow-lg">{error}</p>}
  </div>;
}

export function MessageReactionSummary({ reactions = [], currentUserId, messageId, onReact }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const myReaction = reactions.find((reaction) => reaction.userId === currentUserId)?.emoji;
  const groups = useMemo(() => {
    const counts = new Map();
    for (const reaction of reactions) counts.set(reaction.emoji, (counts.get(reaction.emoji) || 0) + 1);
    return [...counts].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b));
  }, [reactions]);
  if (!groups.length) return null;
  const toggle = async (emoji) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      const chosen = nextReaction(myReaction, emoji);
      if (chosen === undefined) throw new Error("Invalid emoji reaction.");
      await onReact(messageId, chosen);
    }
    catch (cause) { setError(cause?.message || "Could not update your reaction."); }
    finally { pendingRef.current = false; setPending(false); }
  };
  return <div className="mt-1 flex flex-wrap items-center gap-1" aria-label="Message reactions">
    {groups.map(([emoji, count]) => <button key={emoji} type="button" disabled={pending} title={myReaction === emoji ? "Remove your reaction" : `React ${emoji}`} aria-label={`${emoji}: ${count} ${count === 1 ? "reaction" : "reactions"}`} aria-pressed={myReaction === emoji} onClick={() => toggle(emoji)} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-brand ${myReaction === emoji ? "border-brand bg-brand-soft text-ink" : "border-line bg-surface text-ink-soft"}`}><span className="text-sm">{emoji}</span><span>{count}</span></button>)}
    {error && <span role="alert" className="text-xs text-danger">{error}</span>}
  </div>;
}
