import { prettyBytes } from "../api/optimizeUpload";
import { useEffect, useRef, useState } from "react";
import { FileImage, LoaderCircle, RefreshCcw, Upload, X } from "lucide-react";
import { errorText, mediaFile, read, uploadMedia, waitForMedia } from "../api/socialApi";
import { field, smallButton } from "./SocialUI";

export default function MediaPicker({ purpose = "message", variant, accept = "image/*,video/mp4,video/webm,video/quicktime", onReady, label = "Add media" }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [prepared, setPrepared] = useState(null);
  const [state, setState] = useState("idle");
  const [mediaId, setMediaId] = useState(null);
  const [error, setError] = useState("");
  const ctrl = useRef(null);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  useEffect(() => () => ctrl.current?.abort(), []);
  const pick = (chosen) => { if (!chosen) return; if (purpose === "video" && !chosen.type.startsWith("video/")) { setError("Select a video file."); return; } setFile(chosen); setProgress(0); setState("idle"); setMediaId(null); setResult(null); setPrepared(null); setError(""); };
  const run = async (retry = false) => {
    ctrl.current = new AbortController(); setError(""); setState(retry ? "processing" : "preparing");
    try {
      const item = retry ? await (await import("../api/socialApi")).create(`/media/${mediaId}/retry`) : await uploadMedia(file, purpose, setProgress, ctrl.current.signal, setState, { variant, onPrepared: setPrepared });
      setMediaId(item.id); setState("processing");
      const ready = await waitForMedia(item.id, status => setProcessingProgress(status.progress || 0), ctrl.current.signal);
      setResult(ready); setState("ready"); onReady?.(ready);
    } catch (err) { if (!ctrl.current.signal.aborted) { setError(errorText(err)); setState("failed"); } }
  };
  return <div className="space-y-2 rounded-xl border border-dashed border-line-strong bg-canvas p-3" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();pick(e.dataTransfer.files?.[0]);}}>
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink"><Upload size={17}/> {label}<input type="file" accept={accept} className="sr-only" onChange={(e)=>pick(e.target.files?.[0])}/></label>
    {file && <div className="flex items-center gap-3"><div className="size-14 overflow-hidden rounded-lg bg-raised">{file.type.startsWith("image/") ? <img src={preview} alt="Preview" className="size-full object-cover"/> : <video src={preview} muted className="size-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="truncate text-xs text-ink">{file.name}</p><p className="text-xs text-ink-faint">{Math.round(file.size/1024/1024*10)/10} MB</p></div><button type="button" aria-label="Remove upload" disabled={["preparing","optimizing","uploading","processing"].includes(state)} onClick={()=>{setFile(null);setState("idle");onReady?.(null);}}><X size={17}/></button></div>}

    {state === "uploading" && <div role="status" className="space-y-1"><div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand" style={{width:`${progress}%`}}/></div><p className="text-xs text-ink-soft">Uploading {progress}%</p></div>}
    {prepared && !["ready", "idle"].includes(state) && <p className="text-xs text-ink-faint">Original {prettyBytes(prepared.originalSize)} · Prepared for upload {prettyBytes(prepared.uploadSize)}. Final size determined after server optimization.</p>}
    {state === "processing" && <p role="status" className="flex items-center gap-2 text-xs text-ink-soft"><LoaderCircle className="size-4 animate-spin"/> Optimizing media for playback... {processingProgress > 0 ? `${processingProgress}%` : ""}</p>}
    {state === "ready" && <p className="text-xs font-semibold text-success">Stored and ready. {result?.optimizedSize != null && `${prettyBytes(result.originalSize)} → ${prettyBytes(result.optimizedSize)} (${result.savingsPercent || 0}% saved)`}</p>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {file && state === "idle" && <button type="button" className={smallButton} onClick={()=>run()}>Upload and optimize</button>}
    {state === "failed" && <button type="button" className={smallButton} onClick={()=>run(Boolean(mediaId))}><RefreshCcw className="mr-1 inline size-3"/> Retry</button>}
    {["preparing", "optimizing"].includes(state) && <p role="status" className="flex items-center gap-2 text-xs text-ink-soft"><LoaderCircle className="size-4 animate-spin"/>{state === "optimizing" ? "Optimizing image before upload..." : "Preparing file..."}</p>}
    {["preparing", "optimizing", "uploading"].includes(state) && <button type="button" className={smallButton} onClick={()=>{ctrl.current?.abort();setState("idle");}}>Cancel</button>}
  </div>;
}
