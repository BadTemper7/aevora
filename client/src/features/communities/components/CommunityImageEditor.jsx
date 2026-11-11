import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, LoaderCircle, RotateCcw, X } from "lucide-react";
import { uploadMedia, waitForMedia, errorText } from "../../social/api/socialApi";
import { communityFile, communityPatch } from "../api/communityApi";
import { bannerTint } from "./CommunityVisuals";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // Matches the default server image upload limit.
const BUSY_STATES = new Set(["preparing", "optimizing", "uploading", "processing", "saving", "removing"]);

/**
 * Inline community image editor. Uses the browser's native file chooser rather
 * than opening another page or an empty modal. Uploads are processed before a
 * community is updated, so a failure never clears the existing image.
 *
 * When `community` is supplied, the replacement is saved automatically.
 * Without a community (during creation), the media ID is returned via onReady.
 */
export default function CommunityImageEditor({ variant, community, valueId = "", onReady }) {
  const isIcon = variant === "icon";
  const label = isIcon ? "Community icon" : "Community banner";
  const fieldName = isIcon ? "iconId" : "bannerId";
  const cache = useQueryClient();
  const abortRef = useRef(null);
  const [localPreview, setLocalPreview] = useState("");
  const [state, setState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [message, setMessage] = useState("");
  const busy = BUSY_STATES.has(state);
  const previewSource = localPreview || (valueId ? communityFile(valueId, isIcon) : "");

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);

  const refreshCommunity = (id) => {
    cache.setQueryData(["community", "detail", community.id], (data) =>
      data ? { ...data, [fieldName]: id } : data,
    );
    cache.invalidateQueries({ queryKey: ["community", "detail", community.id] });
    cache.invalidateQueries({ queryKey: ["communities", "mine"] });
    cache.invalidateQueries({ queryKey: ["communities", "discover"] });
  };

  const saveImage = async (id, signal) => {
    setState(id ? "saving" : "removing");
    if (signal?.aborted) throw new Error("Upload canceled.");
    await communityPatch(`/communities/${community.id}`, { [fieldName]: id });
    refreshCommunity(id);
    onReady?.(id ? { id } : null);
    setPendingId("");
    setState("ready");
    setLocalPreview("");
    setMessage(id ? `${isIcon ? "Icon" : "Banner"} updated successfully.` : `${isIcon ? "Icon" : "Banner"} removed.`);
  };

  const chooseFile = async (file) => {
    if (!file || busy) return;
    setMessage("");
    setError("");
    setPendingId("");
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, WebP, or AVIF image. GIF and HEIC are not supported here.");
      return;
    }
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      setError("Choose an image smaller than 12 MB.");
      return;
    }
    let preview;
    try { preview = URL.createObjectURL(file); }
    catch { setError("This image could not be previewed. Choose another JPG, PNG, WebP, or AVIF image."); return; }
    setLocalPreview(preview);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    setState("preparing");
    let processedId = "";
    try {
      const uploaded = await uploadMedia(
        file,
        "community",
        setProgress,
        controller.signal,
        setState,
        { variant },
      );
      if (controller.signal.aborted) return;
      setState("processing");
      const ready = await waitForMedia(uploaded.id, setProgress, controller.signal);
      if (controller.signal.aborted) return;
      if (community?.id) {
        processedId = ready.id;
        setPendingId(ready.id);
        await saveImage(ready.id, controller.signal);
      } else {
        onReady?.(ready);
        setState("ready");
        setLocalPreview("");
        setMessage(`${isIcon ? "Icon" : "Banner"} uploaded. It will be applied when you create the community.`);
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(errorText(cause));
      setState(processedId ? "save-failed" : "failed");
      // Keep a successfully uploaded image for a one-click retry if the PATCH fails.
      setLocalPreview("");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const retrySave = async () => {
    if (!pendingId || !community?.id || busy) return;
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    try { await saveImage(pendingId, controller.signal); }
    catch (cause) {
      if (!controller.signal.aborted) { setState("save-failed"); setError(errorText(cause)); }
    } finally { if (abortRef.current === controller) abortRef.current = null; }
  };

  const removeImage = async () => {
    if (busy || !valueId) return;
    setError("");
    setMessage("");
    if (!community?.id) {
      onReady?.(null);
      setState("idle");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setState("removing");
      await saveImage("", controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted) { setState("failed"); setError(errorText(cause)); }
    } finally { if (abortRef.current === controller) abortRef.current = null; }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLocalPreview("");
    setProgress(0);
    setState("idle");
    setMessage("");
    setError("");
  };

  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-line bg-raised/40 p-3 sm:p-4">
      <div>
        <h4 className="text-sm font-bold text-ink">{label}</h4>
        <p className="mt-0.5 text-xs text-ink-soft">
          {isIcon ? "Square image recommended (512 × 512)." : "Wide image recommended (1600 × 600)."}
        </p>
      </div>
      <div
        aria-label={`${label} preview`}
        className={isIcon
          ? "relative grid size-24 place-items-center overflow-hidden rounded-2xl border border-line bg-brand-soft text-3xl font-extrabold text-brand-ink"
          : `relative aspect-[3/1] w-full overflow-hidden rounded-xl border border-line bg-gradient-to-br ${bannerTint(community?.name || "Community")}`}
      >
        {isIcon ? (
          (community?.name?.[0] || "C").toUpperCase()
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-ink-soft">Banner preview</span>
        )}
        {previewSource && (
          <img
            key={previewSource}
            src={previewSource}
            alt={isIcon ? "Selected community icon" : "Selected community banner"}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`relative inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-on-brand ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:brightness-110"}`}>
          <ImagePlus size={16} aria-hidden="true" />
          {valueId ? `Change ${isIcon ? "icon" : "banner"}` : `Choose ${isIcon ? "icon" : "banner"}`}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            aria-label={`Choose ${label.toLowerCase()} image`}
            disabled={busy}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = ""; // Allow selecting the same file again after a failure.
              if (file) void chooseFile(file);
            }}
          />
        </label>
        {valueId && !busy && (
          <button
            type="button"
            onClick={removeImage}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-raised"
          >
            <RotateCcw size={15} aria-hidden="true" /> Reset
          </button>
        )}
        {busy && state !== "saving" && state !== "removing" && (
          <button type="button" onClick={cancel} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
            <X size={15} aria-hidden="true" /> Cancel
          </button>
        )}
        {state === "save-failed" && pendingId && (
          <button type="button" onClick={retrySave} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
            <RotateCcw size={15} aria-hidden="true" /> Retry saving
          </button>
        )}
      </div>
      {busy && (
        <div role="status" className="space-y-1.5 text-xs text-ink-soft">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {state === "saving" ? "Applying image to community..." : state === "removing" ? "Removing image..." : state === "processing" ? "Processing image..." : state === "uploading" ? `Uploading ${progress}%` : "Preparing image..."}
          </span>
          {state === "uploading" && <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 w-full overflow-hidden rounded-full bg-line"><div className="h-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>}
        </div>
      )}
      {message && !busy && <p role="status" className="flex items-center gap-2 text-xs font-medium text-success"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
      <p className="text-[11px] text-ink-faint">JPG, PNG, WebP or AVIF · Max 12 MB</p>
    </div>
  );
}
