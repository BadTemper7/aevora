import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle } from "lucide-react";

import { cn } from "../../utils/cn";

// Loaded only when a picker is first opened. Includes the complete emoji library:
// search, categories, skin tones, and recently used emojis.
const FullEmojiLibrary = lazy(() => import("emoji-picker-react"));

class EmojiLibraryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p role="alert" className="p-4 text-sm text-danger">Could not load emojis. Check your connection and retry.</p>;
    }
    return this.props.children;
  }
}

export default function EmojiPicker({
  open,
  onSelect,
  onClose,
  anchorRef,
  className,
  label = "Choose an emoji",
}) {
  const pickerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (pickerRef.current?.contains(event.target)) return;
      if (anchorRef?.current?.contains(event.target)) return;
      onCloseRef.current?.();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords({ top: -9999, left: -9999 });
      return undefined;
    }
    const updatePosition = () => {
      if (!anchorRef?.current || !pickerRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth || rect.width === 0) {
        onCloseRef.current?.();
        return;
      }
      const box = pickerRef.current.getBoundingClientRect();
      const margin = 8;
      const above = rect.top;
      const below = window.innerHeight - rect.bottom;
      let top = above >= box.height + margin || above > below
        ? rect.top - box.height - margin
        : rect.bottom + margin;
      top = Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - box.height - margin));
      let left = rect.left;
      if (left + box.width > window.innerWidth - margin) left = rect.right - box.width;
      left = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - box.width - margin));
      setCoords({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  const pickerHeight = typeof window === "undefined" ? 350 : Math.min(350, window.innerHeight - 42);
  const scheme = typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  return createPortal(
    <div
      ref={pickerRef}
      data-emoji-picker-root
      role="dialog"
      aria-label={label}
      style={{ top: coords.top, left: coords.left, opacity: coords.top === -9999 ? 0 : 1 }}
      className={cn("fixed z-[200] w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl", className)}
    >
      <EmojiLibraryErrorBoundary>
        <Suspense fallback={<div className="flex h-48 items-center justify-center gap-2 text-ink-soft"><LoaderCircle size={20} className="animate-spin"/> Loading emojis...</div>}>
          <FullEmojiLibrary
            width="100%"
            height={pickerHeight}
            colorScheme={scheme}
            emojiStyle="native"
            onEmojiClick={(data) => onSelect?.(data.emoji)}
            previewConfig={{ showPreview: false }}
          />
        </Suspense>
      </EmojiLibraryErrorBoundary>
    </div>,
    document.body,
  );
}
