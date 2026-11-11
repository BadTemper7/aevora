import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle } from "lucide-react";

import { cn } from "../../utils/cn";

// Loaded only when opened: searchable emojis, categories and skin tones.
const FullEmojiLibrary = lazy(() => import("emoji-picker-react"));

class EmojiLibraryErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <p role="alert" className="p-4 text-sm text-danger">Could not load emojis. Check your connection and retry.</p>;
    return this.props.children;
  }
}

const INITIAL_POSITION = { top: -9999, left: -9999, width: 320, height: 280 };

export default function EmojiPicker({ open, onSelect, onClose, anchorRef, className, label = "Choose an emoji" }) {
  const pickerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [coords, setCoords] = useState(INITIAL_POSITION);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (pickerRef.current?.contains(event.target) || anchorRef?.current?.contains(event.target)) return;
      onCloseRef.current?.();
    };
    const onKeyDown = (event) => { if (event.key === "Escape") onCloseRef.current?.(); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, anchorRef]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const anchor = anchorRef?.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const visual = window.visualViewport;
      // VisualViewport shrinks when the virtual keyboard opens. innerHeight does not
      // always shrink, causing bottom-aligned emoji pickers to leave the screen.
      const viewportLeft = visual?.offsetLeft || 0;
      const viewportTop = visual?.offsetTop || 0;
      const viewportWidth = visual?.width || window.innerWidth;
      const viewportHeight = visual?.height || window.innerHeight;
      const margin = 8;
      if (rect.bottom < viewportTop || rect.top > viewportTop + viewportHeight || rect.right < viewportLeft || rect.left > viewportLeft + viewportWidth) {
        onCloseRef.current?.();
        return;
      }
      const above = Math.max(0, rect.top - viewportTop);
      const below = Math.max(0, viewportTop + viewportHeight - rect.bottom);
      const placeAbove = above >= below || above >= 350 + margin;
      const available = placeAbove ? above : below;
      const height = Math.max(120, Math.min(350, available - 2 * margin, viewportHeight - 2 * margin));
      const width = Math.max(160, Math.min(340, viewportWidth - 2 * margin));
      let top = placeAbove ? rect.top - height - margin : rect.bottom + margin;
      top = Math.max(viewportTop + margin, Math.min(top, viewportTop + viewportHeight - height - margin));
      let left = rect.left;
      if (left + width > viewportLeft + viewportWidth - margin) left = rect.right - width;
      left = Math.max(viewportLeft + margin, Math.min(left, viewportLeft + viewportWidth - width - margin));
      const next = { top: Math.round(top), left: Math.round(left), width: Math.round(width), height: Math.round(height) };
      setCoords((current) => Object.keys(next).every((key) => next[key] === current[key]) ? current : next);
    };
    updatePosition();
    const visual = window.visualViewport;
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updatePosition) : null;
    if (anchorRef?.current) observer?.observe(anchorRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    visual?.addEventListener("resize", updatePosition);
    visual?.addEventListener("scroll", updatePosition);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      visual?.removeEventListener("resize", updatePosition);
      visual?.removeEventListener("scroll", updatePosition);
    };
  }, [open, anchorRef]);

  if (!open) return null;
  const scheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";

  return createPortal(
    <div
      ref={pickerRef}
      data-emoji-picker-root
      role="dialog"
      aria-label={label}
      style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.height + 2, opacity: coords.top === -9999 ? 0 : 1 }}
      className={cn("fixed z-[220] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl", className)}
    >
      <EmojiLibraryErrorBoundary>
        <Suspense fallback={<div className="flex h-48 items-center justify-center gap-2 text-ink-soft"><LoaderCircle size={20} className="animate-spin"/> Loading emojis...</div>}>
          <FullEmojiLibrary
            width="100%"
            height={coords.height}
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
