import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, FileText, FileUp, LoaderCircle, Play, Send, Smile, X } from "lucide-react";
import EmojiPicker from "../../../components/common/EmojiPicker";
import { errorText, remove, uploadMedia, waitForMedia } from "../api/socialApi";
import { field, smallButton } from "../components/SocialUI";
import GifPicker from "./GifPicker";
import { ATTACHMENT_ACCEPT, attachmentKind, formatFileSize, messageKindFor, validateAttachment } from "./attachmentRules";

// Attachments stay as local File objects until Send. Processing and cloud storage
// complete before the message API receives any media IDs.
export default function ChatComposer({ text, setText, media, setMedia, reply, cancelReply, editing, cancelEditing, onSubmit, onSendStart, onSendProgress, onSendFailure, onGif, onTyping, onQuickEmoji, quickEmoji = "👍", busy, disabled, mediaPurpose = "message" }) {
  const input = useRef(null);
  const fileInput = useRef(null);
  const emojiAnchor = useRef(null);
  const controller = useRef(null);
  const running = useRef(false);
  const activeId = useRef(null);
  const mounted = useRef(true);
  const urls = useRef(new Set());
  const queuedRef = useRef([]);
  const [queued, setQueued] = useState([]);
  const [previewKey, setPreviewKey] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { queuedRef.current = queued; }, [queued]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
    };
  }, []);
  useEffect(() => { if (reply || editing) input.current?.focus(); }, [reply?._id, editing?._id]);
  useEffect(() => {
    if (previewKey === null) return;
    const onEscape = (event) => { if (event.key === "Escape") setPreviewKey(null); };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [previewKey]);
  useLayoutEffect(() => {
    const box = input.current;
    if (!box) return;
    // 5 lines at 24px line height plus 20px vertical padding.
    const minHeight = 44;
    const maxHeight = 140;
    box.style.overflowY = "hidden";
    box.style.height = `${minHeight}px`;
    const measured = box.scrollHeight;
    box.style.height = `${Math.min(maxHeight, Math.max(minHeight, measured))}px`;
    box.style.overflowY = measured > maxHeight ? "auto" : "hidden";
  }, [text, editing?._id]);

  const addFiles = (incoming) => {
    if (editing || sending || busy || disabled || !incoming?.length) return;
    const files = Array.from(incoming);
    let next = [...queuedRef.current];
    let problem = "";
    for (const file of files) {
      const validation = validateAttachment(file, next);
      if (validation) { problem ||= validation; continue; }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      next.push({ key: `${Date.now()}-${Math.random()}`, file, url, kind: attachmentKind(file), stage: "selected", percent: 0, uploaded: null });
    }
    queuedRef.current = next;
    setQueued(next);
    setNotice(problem);
    if (fileInput.current) fileInput.current.value = "";
  };
  const releaseUrls = (items) => items.forEach((item) => {
    if (urls.current.delete(item.url)) URL.revokeObjectURL(item.url);
  });
  const removeOne = (key) => {
    if (sending) return;
    const gone = queuedRef.current.find((item) => item.key === key);
    if (!gone) return;
    releaseUrls([gone]);
    // A completed, unused upload should not permanently consume cloud storage.
    if (gone.uploaded?.id) void remove(`/media/${gone.uploaded.id}`).catch(() => {});
    const next = queuedRef.current.filter((item) => item.key !== key);
    queuedRef.current = next;
    setQueued(next);
    setNotice("");
  };
  const changeFile = (key, changes) => {
    if (!mounted.current) return;
    const next = queuedRef.current.map((entry) => entry.key === key ? { ...entry, ...changes } : entry);
    queuedRef.current = next;
    setQueued(next);
  };
  const updateStage = (clientId, item, stage, progress = 0) => {
    changeFile(item.key, { stage, percent: progress });
    onSendProgress?.({ clientId, stage, percent: progress, fileName: item.file.name });
  };
  const valid = Boolean(text.trim() || (queued.length && !editing) || (media && !editing));
  const showQuickEmoji = !editing && !text.trim() && !queued.length && !media;
  const cancelTransfer = () => { controller.current?.abort(); setNotice("Upload canceled. Your attachments are still in the composer."); };

  const send = async (event) => {
    event?.preventDefault?.();
    if (running.current || busy || disabled || !valid) return;
    const isEdit = Boolean(editing);
    const files = isEdit ? [] : [...queuedRef.current];
    const submissionId = activeId.current || crypto.randomUUID();
    const draftText = text;
    const abort = new AbortController();
    controller.current = abort;
    running.current = true;
    setSending(true);
    setNotice("");
    if (!activeId.current && !isEdit) {
      activeId.current = submissionId;
      onSendStart?.({ clientId: submissionId, text: draftText, attachments: files, kind: messageKindFor(files), replyTo: reply?._id || reply?.id });
    }
    try {
      const uploaded = [];
      if (!isEdit) for (const item of files) {
        if (abort.signal.aborted) throw new Error("Upload canceled.");
        if (item.uploaded?.id) { uploaded.push(item.uploaded); continue; }
        updateStage(submissionId, item, "preparing");
        const received = await uploadMedia(
          item.file, mediaPurpose,
          (percent) => updateStage(submissionId, item, "uploading", percent),
          abort.signal,
          (stage) => updateStage(submissionId, item, stage),
        );
        updateStage(submissionId, item, "processing");
        const ready = await waitForMedia(received.id,
          (status) => updateStage(submissionId, item, status.status === "ready" ? "ready" : "processing", status.progress || 0),
          abort.signal,
        );
        const record = { ...ready, id: received.id, kind: received.kind || item.kind, originalName: item.file.name };
        changeFile(item.key, { stage: "ready", percent: 100, uploaded: record });
        uploaded.push(record);
      }
      // Existing MediaPicker-ready attachments remain supported for older callers.
      if (!isEdit && media?.id) uploaded.push(media);
      if (abort.signal.aborted) throw new Error("Upload canceled.");
      await onSubmit({ clientId: submissionId, text: draftText, attachments: uploaded, kind: messageKindFor(uploaded), replyTo: reply?._id || reply?.id });
      if (!mounted.current) return;
      releaseUrls(files);
      queuedRef.current = [];
      setQueued([]);
      setPreviewKey(null);
      setText("");
      setMedia?.(null);
      if (!isEdit) cancelReply?.();
      activeId.current = null;
    } catch (cause) {
      if (mounted.current) setNotice(errorText(cause) + " Your draft is saved here. Try Send again.");
      onSendFailure?.({ clientId: submissionId, error: cause });
    } finally {
      controller.current = null;
      running.current = false;
      if (mounted.current) setSending(false);
    }
  };

  const activePreview = queued.find((entry) => entry.key === previewKey);
  return <form className="shrink-0 space-y-2 border-t border-line bg-surface p-3" onSubmit={send} aria-label="Message composer"
    onDragOver={(event) => { if (event.dataTransfer?.types?.includes("Files")) event.preventDefault(); }}
    onDrop={(event) => { if (event.dataTransfer?.files?.length) { event.preventDefault(); addFiles(event.dataTransfer.files); } }}
    onPaste={(event) => { if (event.clipboardData?.files?.length) { event.preventDefault(); addFiles(event.clipboardData.files); } }}>
    {reply && !editing && <div className="flex items-center justify-between gap-2 rounded-lg border-l-2 border-brand bg-raised px-3 py-2 text-xs text-ink-soft"><span className="min-w-0 truncate">Replying to: {reply.text?.slice(0, 100) || "attachment"}</span><button type="button" disabled={sending} onClick={cancelReply} title="Cancel reply"><X size={16}/></button></div>}
    {editing && <div role="status" className="flex items-center justify-between gap-2 rounded-lg border-l-2 border-brand bg-brand-soft px-3 py-2 text-xs font-semibold text-ink"><span>Editing message · Enter to save · Esc to cancel</span><button type="button" onClick={cancelEditing} disabled={sending || busy} title="Cancel edit"><X size={16}/></button></div>}
    {queued.length > 0 && !editing && <div className="custom-scrollbar max-h-40 overflow-y-auto rounded-xl border border-line bg-canvas p-2" aria-label="Selected attachments">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{queued.map((item) => <div key={item.key} className="relative min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
        {item.kind === "image" || item.kind === "gif" ? <button type="button" className="block w-full" onClick={() => setPreviewKey(item.key)} aria-label={`Preview ${item.file.name}`}><img className="h-20 w-full object-cover" src={item.url} alt={item.file.name}/></button>
          : item.kind === "video" ? <button type="button" className="relative block h-20 w-full overflow-hidden bg-black" onClick={() => setPreviewKey(item.key)} aria-label={`Preview video ${item.file.name}`}><video className="h-full w-full object-cover" preload="metadata" muted playsInline src={`${item.url}#t=0.1`} onLoadedMetadata={(event) => changeFile(item.key, { duration: event.currentTarget.duration })}/><span className="pointer-events-none absolute inset-0 grid place-items-center text-white"><Play size={22} fill="currentColor"/></span>{Number.isFinite(item.duration) && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white">{Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, "0")}</span>}</button>
            : <div className="flex h-20 items-center justify-center gap-2 px-2"><FileText className="shrink-0 text-ink-soft" size={25}/><span className="break-all text-xs">{item.file.name.split(".").pop()?.toUpperCase()}</span></div>}
        <button type="button" disabled={sending} onClick={() => removeOne(item.key)} title={`Remove ${item.file.name}`} aria-label={`Remove ${item.file.name}`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/65 text-white disabled:opacity-50"><X size={14}/></button>
        <div className="space-y-0.5 px-2 py-1"><p title={item.file.name} className="truncate text-[11px] font-semibold">{item.file.name}</p><p className="text-[10px] text-ink-faint">{formatFileSize(item.file.size)}{item.stage !== "selected" ? ` · ${item.stage}` : ""}</p>{["uploading", "processing", "optimizing"].includes(item.stage) && <div className="h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand" style={{ width: `${Math.max(5, item.percent)}%` }}/></div>}</div>
      </div>)}</div>
    </div>}
    <div className="flex items-end gap-1.5 sm:gap-2">
      <input ref={fileInput} type="file" className="sr-only" multiple accept={ATTACHMENT_ACCEPT} aria-label="Choose message attachments" onChange={(event) => addFiles(event.target.files)} disabled={Boolean(editing || sending || busy || disabled)}/>
      <button type="button" disabled={Boolean(editing || sending || busy || disabled)} title="Attach images, videos or files" aria-label="Attach images, videos or files" className={smallButton} onClick={() => fileInput.current?.click()}><FileUp size={18}/></button>
      <div className="relative"><button type="button" disabled={sending || busy || editing} aria-expanded={gifOpen} title="Send a GIF" aria-label="Open GIF picker" className={smallButton} onClick={() => { setGifOpen((v) => !v); setEmojiOpen(false); }}><span className="text-xs font-extrabold">GIF</span></button>{gifOpen && <GifPicker onSelect={(gif) => { onGif(gif); setGifOpen(false); }} onClose={() => setGifOpen(false)} busy={sending || busy}/>}</div>
      <div className="relative"><button ref={emojiAnchor} type="button" title="Insert emoji" aria-label="Insert emoji" className={smallButton} onClick={() => { setEmojiOpen((v) => !v); setGifOpen(false); }}><Smile size={18}/></button><EmojiPicker open={emojiOpen} anchorRef={emojiAnchor} onClose={() => setEmojiOpen(false)} onSelect={(emoji) => { setText((s) => `${s}${emoji}`); setEmojiOpen(false); input.current?.focus(); }}/></div>
      <textarea ref={input} id="chat-composer" rows={1} maxLength={5000} disabled={sending || busy || disabled}
        value={text} onChange={(event) => { setText(event.target.value); if (!editing) onTyping?.(Boolean(event.target.value)); }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && editing) { event.preventDefault(); cancelEditing(); }
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); void send(); }
        }}
        placeholder={editing ? "Update your message..." : "Write a message..."}
        aria-label={editing ? "Edit message" : "Message text"}
        className={`${field} min-h-11 min-w-0 flex-1 !resize-none !py-2.5 leading-6`}
        style={{ resize: "none", height: 44, maxHeight: 140, overflowY: "hidden", boxSizing: "border-box" }}/>
      {showQuickEmoji && <button title={`Send ${quickEmoji}`} aria-label={`Send quick emoji ${quickEmoji}`} type="button" onClick={onQuickEmoji} disabled={sending || busy || disabled} className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink text-2xl hover:brightness-95 disabled:opacity-50">{quickEmoji}</button>}
      <button title={editing ? "Save changes" : "Send message"} aria-label={editing ? "Save message changes" : "Send message"} type="submit" disabled={sending || busy || disabled || !valid} className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-on-brand disabled:opacity-50">
        {sending || busy ? <LoaderCircle size={20} className="animate-spin"/> : editing ? <Check size={19}/> : <Send size={19}/>}<span className="sr-only">{editing ? "Save changes" : "Send"}</span>
      </button>
    </div>
    {sending && <div role="status" className="flex items-center justify-between gap-2 text-xs text-ink-soft"><span className="flex items-center gap-1.5"><LoaderCircle className="size-3.5 animate-spin"/> {queued.some((item) => item.stage === "processing") ? "Processing and optimizing attachments..." : queued.some((item) => item.stage === "uploading") ? "Uploading attachments..." : "Sending message..."}</span>{queued.length > 0 && <button type="button" className="underline" onClick={cancelTransfer}>Cancel upload</button>}</div>}
    {notice && <p role="alert" className="text-xs text-danger">{notice}</p>}
    {activePreview && <div role="dialog" aria-modal="true" aria-label={`Preview ${activePreview.file.name}`} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewKey(null)}>
      <div className="relative max-h-[90vh] max-w-[95vw]" onClick={(event) => event.stopPropagation()}><button type="button" autoFocus onClick={() => setPreviewKey(null)} aria-label="Close attachment preview" className="absolute right-2 top-2 z-10 rounded-full bg-black/70 p-2 text-white"><X size={20}/></button>
        {activePreview.kind === "video" ? <video src={activePreview.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg"/> : activePreview.kind === "file" ? <div className="rounded-xl bg-surface p-8 text-ink"><FileText size={44}/><p className="mt-3 break-all font-semibold">{activePreview.file.name}</p><p>{formatFileSize(activePreview.file.size)}</p></div> : <img src={activePreview.url} alt={activePreview.file.name} className="max-h-[85vh] max-w-full rounded-lg object-contain"/>}
      </div>
    </div>}
  </form>;
}
