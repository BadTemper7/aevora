import { ImagePlus, SmilePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  POST_MAX_IMAGES,
  POST_MAX_LENGTH,
} from "../../../../app/config/constants";
import EmojiPicker from "../../../../components/common/EmojiPicker";
import Avatar from "../../../../components/ui/Avatar";
import Button from "../../../../components/ui/Button";
import { cn } from "../../../../utils/cn";
import { uploadMedia, waitForMedia } from "../../api/socialApi";

const DRAFT_STORAGE_KEY = "composer:draft";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per photo

export default function PostComposer({ user, onSubmit }) {
  const [content, setContent] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [images, setImages] = useState([]); // [{ id, url }]
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState("");

  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const emojiRef = useRef(null);
  const imagesRef = useRef(images);
  const location = useLocation();

  // Focus composer when "Create" button routes here with state
  useEffect(() => {
    if (location.state?.focusComposer) textareaRef.current?.focus();
  }, [location.key, location.state]);

  // Keep a live ref so unmount can revoke any un-published blob URLs
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    },
    [],
  );

  // Auto-grow the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  // Persist text as a draft
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (content.trim()) localStorage.setItem(DRAFT_STORAGE_KEY, content);
        else localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* storage full / disabled — best-effort */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [content]);

  // Auto-clear notices
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const remaining = POST_MAX_LENGTH - content.length;
  const room = POST_MAX_IMAGES - images.length;
  const canPost =
    (content.trim().length > 0 || images.length > 0) &&
    remaining >= 0 &&
    !isSubmitting;

  /** Shared file intake: input, paste, and drag & drop */
  const addFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const accepted = [];
    let rejected = 0;

    for (const file of files) {
      const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(file.type);
      if (!isImage || file.size > MAX_IMAGE_BYTES || accepted.length >= room) {
        rejected += 1;
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > 0) {
      setImages((current) => [
        ...current,
        ...accepted.map((file) => ({
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          file,
        })),
      ]);
    }

    if (rejected > 0) {
      setNotice(
        room <= 0
          ? `You can attach up to ${POST_MAX_IMAGES} photos.`
          : `${rejected} file${rejected > 1 ? "s" : ""} skipped — images only, up to 8 MB each.`,
      );
    }
  };

  const removeImage = (id) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((image) => image.id !== id);
    });
  };

  /** Insert emoji at caret. Emoji buttons preventDefault on mousedown,
   *  so the textarea stays focused and `selectionStart` is always live. */
  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);

    if (next.length > POST_MAX_LENGTH) {
      setNotice(
        `Your post can't be longer than ${POST_MAX_LENGTH} characters.`,
      );
      return;
    }

    setContent(next);
    requestAnimationFrame(() => {
      if (!textarea) return;
      const caret = start + emoji.length;
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  };

  const handlePaste = (event) => {
    const files = Array.from(event.clipboardData?.items ?? [])
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);

    if (files.length === 0) return;
    event.preventDefault(); // don't paste the file name as text
    addFiles(files);
  };

  const handleKeyDown = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canPost) return;

    setIsSubmitting(true);
    try {
      const mediaIds = [];
      for (let index = 0; index < images.length; index += 1) {
        const item = images[index];
        setProgress(`Uploading photo ${index + 1} of ${images.length}...`);
        const uploaded = await uploadMedia(item.file, "post", (value) => setProgress(`Uploading photo ${index + 1} of ${images.length}: ${value}%`));
        setProgress(`Optimizing photo ${index + 1} of ${images.length}...`);
        await waitForMedia(uploaded.id);
        mediaIds.push(uploaded.id);
      }
      setProgress("Publishing post...");
      await onSubmit({ content: content.trim(), mediaIds, visibility: "public" });
      images.forEach((image) => URL.revokeObjectURL(image.url));
      setContent("");
      setImages([]);
      setEmojiOpen(false);
      setNotice("");
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } catch (error) {
      setNotice(error?.response?.data?.error?.message || error?.message || "Your post could not be published. Try again.");
    } finally {
      setProgress("");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Create a post"
      onDragOver={(event) => {
        if (!event.dataTransfer?.types?.includes("Files")) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (!event.dataTransfer?.files?.length) return;
        event.preventDefault();
        setIsDragging(false);
        addFiles(event.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-2xl border border-line bg-surface p-4 transition-colors sm:p-5",
        isDragging && "border-ink-soft ring-2 ring-ink-soft/20",
      )}
    >
      {isDragging && (
        <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface/85 text-sm font-semibold text-ink-soft">
          Drop photos to attach
        </p>
      )}

      <div className="flex gap-3">
        <Avatar name={user?.name} size="md" />

        <div className="min-w-0 flex-1">
          <label htmlFor="composer" className="sr-only">
            What&apos;s on your mind?
          </label>
          <textarea
            id="composer"
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`What's on your mind, ${user?.name?.split(" ")[0] ?? "friend"}?`}
            aria-describedby="composer-hint"
            className="max-h-64 w-full resize-none overflow-y-auto bg-transparent pt-2.5 text-[15px] leading-6 outline-none placeholder:text-ink-faint"
          />
          <p id="composer-hint" className="sr-only">
            Press Control or Command plus Enter to publish.
          </p>

          {images.length > 0 && (
            <ul className="mt-2 grid grid-cols-4 gap-2">
              {images.map((image) => (
                <li
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-xl"
                >
                  <img
                    src={image.url}
                    alt="Attached photo"
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Screen-reader + sighted feedback for rejected files / errors */}
      {progress && <p role="status" className="mt-2 text-xs font-medium text-brand-ink">{progress}</p>}
      <p
        aria-live="polite"
        className="mt-2 text-xs font-medium text-danger empty:hidden"
      >
        {notice}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={ImagePlus}
            disabled={room <= 0 || isSubmitting}
            onClick={() => fileRef.current?.click()}
          >
            {images.length > 0
              ? `Photo ${images.length}/${POST_MAX_IMAGES}`
              : "Photo"}
          </Button>

          <div ref={emojiRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={SmilePlus}
              disabled={remaining <= 0 || isSubmitting}
              aria-expanded={emojiOpen}
              aria-haspopup="dialog"
              onClick={() => setEmojiOpen((open) => !open)}
            >
              Emoji
            </Button>

            <EmojiPicker
              open={emojiOpen}
              onSelect={insertEmoji}
              onClose={() => setEmojiOpen(false)}
              anchorRef={emojiRef}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(content.length > 0 || remaining < 0) && (
            <span
              aria-live="polite"
              className={cn(
                "text-xs font-semibold tabular-nums",
                remaining < 0 ? "text-danger" : "text-ink-soft",
              )}
            >
              {remaining < 0 ? `${-remaining} over` : remaining}
            </span>
          )}
          <Button type="submit" size="sm" disabled={!canPost} className="px-5">
            {isSubmitting ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>
    </form>
  );
}
