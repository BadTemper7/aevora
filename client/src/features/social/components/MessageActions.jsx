import { Copy, Edit3, EyeOff, Flag, LoaderCircle, MoreHorizontal, Pin, PinOff, Reply, SmilePlus, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { REACTION_OPTIONS, nextReaction } from "./reactionOptions";
import EmojiPicker from "../../../components/common/EmojiPicker";

const QUICK_REACTIONS = REACTION_OPTIONS.slice(0, 4);
const iconButton = "grid size-9 shrink-0 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50";

/** Hover on desktop, tap or long-press the bubble on touch. No floating smiley by default. */
export function MessageActions({ message, currentUserId, isMine, quickEmoji, canPin = true, canDeleteEveryone = isMine, openRequest = 0, onReact, onReply, onCopy, onEdit, onDelete, onDeleteMe, onPin, onReport }) {
  const rootRef = useRef(null);
  const portalRef = useRef(null);
  const pickerButtonRef = useRef(null);
  const pendingRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 8, left: 8, menuAbove: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const myReaction = message.reactions?.find((reaction) => reaction.userId === currentUserId)?.emoji;
  const visibleReactions = useMemo(() => {
    const extras = quickEmoji ? [{ emoji: quickEmoji, label: "Chat reaction" }] : [];
    return [...extras, ...QUICK_REACTIONS].filter((item, index, all) => all.findIndex((value) => value.emoji === item.emoji) === index).slice(0, 4);
  }, [quickEmoji]);

  useEffect(() => { if (openRequest > 0) setTouchOpen(true); }, [openRequest]);
  useLayoutEffect(() => {
    if (!touchOpen) return undefined;
    const moveToolbar = () => {
      const anchor = rootRef.current?.closest("article")?.querySelector("[data-message-bubble]") || rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const view = window.visualViewport;
      const top = view?.offsetTop || 0;
      const left = view?.offsetLeft || 0;
      const width = view?.width || window.innerWidth;
      const height = view?.height || window.innerHeight;
      const margin = 8;
      const buttonWidth = 36;
      const estimatedWidth = Math.min(width - margin * 2, visibleReactions.length * buttonWidth + 3 * buttonWidth + 24);
      const measuredWidth = portalRef.current?.getBoundingClientRect().width || estimatedWidth;
      const toolbarWidth = Math.min(measuredWidth, width - margin * 2);
      const toolbarHeight = portalRef.current?.getBoundingClientRect().height || 44;
      let x = isMine ? rect.right - toolbarWidth : rect.left;
      x = Math.max(left + margin, Math.min(x, left + width - toolbarWidth - margin));
      let y = rect.top - toolbarHeight - margin;
      if (y < top + margin) y = rect.bottom + margin;
      y = Math.max(top + margin, Math.min(y, top + height - toolbarHeight - margin));
      setToolbarPosition((current) => current.top === Math.round(y) && current.left === Math.round(x) && current.menuAbove === (y > top + height / 2)
        ? current : { top: Math.round(y), left: Math.round(x), menuAbove: y > top + height / 2 });
    };
    moveToolbar();
    const view = window.visualViewport;
    window.addEventListener("resize", moveToolbar);
    window.addEventListener("scroll", moveToolbar, true);
    view?.addEventListener("resize", moveToolbar);
    view?.addEventListener("scroll", moveToolbar);
    return () => {
      window.removeEventListener("resize", moveToolbar);
      window.removeEventListener("scroll", moveToolbar, true);
      view?.removeEventListener("resize", moveToolbar);
      view?.removeEventListener("scroll", moveToolbar);
    };
  }, [touchOpen, isMine, visibleReactions.length]);

  useEffect(() => {
    if (!pickerOpen && !menuOpen && !touchOpen) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target) && !portalRef.current?.contains(event.target) && !event.target?.closest?.("[data-emoji-picker-root]")) {
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

  const toolbar = (mobile) => <>
    {visibleReactions.map(({ emoji, label }) => <button key={emoji} type="button" aria-label={`React ${label}`} aria-pressed={myReaction === emoji} title={label} disabled={pending} onClick={() => react(emoji)} className={`grid size-9 shrink-0 place-items-center rounded-lg text-lg leading-none transition-all hover:bg-raised focus-visible:outline-2 focus-visible:outline-brand ${myReaction === emoji ? "bg-brand-soft ring-1 ring-brand" : ""}`}>{emoji}</button>)}
    <div className="relative">
      <button ref={mobile === touchOpen ? pickerButtonRef : null} type="button" aria-label="Add reaction" title="Add reaction" aria-haspopup="dialog" aria-expanded={pickerOpen} disabled={pending} onClick={() => { setPickerOpen((open) => !open); setMenuOpen(false); }} className={iconButton}>{pending ? <LoaderCircle size={17} className="animate-spin" /> : <SmilePlus size={18}/>}</button>
      {mobile === touchOpen && <EmojiPicker open={pickerOpen} anchorRef={pickerButtonRef} label="Choose a message reaction" onClose={() => setPickerOpen(false)} onSelect={(emoji) => react(emoji)}/>}
    </div>
    <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-line" />
    <button type="button" className={iconButton} title="Reply" aria-label="Reply to message" onClick={() => runAction(onReply)}><Reply size={17}/></button>
    <div className="relative">
      <button type="button" className={iconButton} title="More message options" aria-label="More message options" aria-expanded={menuOpen} onClick={() => { setMenuOpen((open) => !open); setPickerOpen(false); }}><MoreHorizontal size={19}/></button>
      {menuOpen && <div role="menu" aria-label="Message options" className={`absolute z-50 max-h-[min(44dvh,280px)] min-w-44 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-sm text-ink shadow-xl ${isMine ? "right-0" : "left-0"} ${mobile && toolbarPosition.menuAbove ? "bottom-full mb-2" : "top-full mt-2"}`}>
        {message.text && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onCopy)}><Copy size={15}/> Copy text</button>}
        {isMine && message.text && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onEdit)}><Edit3 size={15}/> Edit message</button>}
        {canPin && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onPin)}>{message.pinnedAt ? <PinOff size={15}/> : <Pin size={15}/>} {message.pinnedAt ? "Unpin message" : "Pin message"}</button>}
        <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onDeleteMe)}><EyeOff size={15}/> Delete for Me</button>
        {canDeleteEveryone && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-danger hover:bg-raised" onClick={() => runAction(onDelete)}><Trash2 size={15}/> Delete for Everyone</button>}
        {!isMine && <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-raised" onClick={() => runAction(onReport)}><Flag size={15}/> Report</button>}
      </div>}
    </div>
  </>;

  const toolbarStyle = "items-center gap-0.5 rounded-xl border border-line bg-surface px-1 py-0.5 text-ink shadow-lg";
  return <>
    <div ref={rootRef} className={`absolute top-0 z-30 ${isMine ? "right-0" : "left-0"}`}>
      <button type="button" title="Message actions" aria-label="Show message reactions and actions" aria-expanded={touchOpen} onClick={() => setTouchOpen((open) => !open)} className="sr-only focus:not-sr-only focus:absolute focus:right-0 focus:top-0 focus:z-40 focus:grid focus:size-9 focus:place-items-center focus:rounded-full focus:bg-surface"><SmilePlus size={17}/></button>
      <div role="toolbar" aria-label="Message reactions and actions" className={`${toolbarStyle} absolute top-0 flex max-w-[calc(100vw-1rem)] ${isMine ? "right-0" : "left-0"} pointer-events-none opacity-0 [@media(hover:none)]:hidden [@media(hover:hover)]:group-hover/message:pointer-events-auto [@media(hover:hover)]:group-hover/message:opacity-100 [@media(hover:hover)]:group-focus-within/message:pointer-events-auto [@media(hover:hover)]:group-focus-within/message:opacity-100`}>
        {toolbar(false)}
      </div>
    </div>
    {touchOpen && createPortal(
      <div ref={portalRef} data-message-actions-mobile role="toolbar" aria-label="Message reactions and actions" style={{ top: toolbarPosition.top, left: toolbarPosition.left, maxWidth: "calc(100vw - 1rem)" }} className={`${toolbarStyle} fixed z-[210] flex`}>
        {toolbar(true)}
      </div>, document.body,
    )}
    {error && <p role="alert" className="absolute bottom-full z-30 mb-1 max-w-56 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-danger shadow-lg">{error}</p>}
  </>;
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
