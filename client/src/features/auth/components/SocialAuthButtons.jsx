import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import Button from "../../../components/ui/Button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** Google login or registration stays in its popup until OAuth finishes. */
export default function SocialAuthButtons({ onSelect, onError, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const activeRequest = useRef(null);

  function cancel() {
    activeRequest.current?.abort();
  }

  async function handleClick() {
    if (busy || disabled) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true);
    setStatus("Opening Google sign-in...");
    try {
      await onSelect({ signal: controller.signal, onStatus: setStatus });
    } catch (error) {
      if (error?.name !== "AbortError") onError?.(error);
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      setBusy(false);
      setStatus("");
    }
  }

  return (
    <div className="space-y-2.5">
      <Button variant="secondary" fullWidth onClick={handleClick} loading={busy} disabled={busy || disabled}>
        {busy ? "Connecting to Google..." : <><GoogleIcon /> Continue with Google</>}
      </Button>
      {busy && (
        <div className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-soft" role="status" aria-live="polite">
          <LoaderCircle size={17} className="mt-0.5 shrink-0 animate-spin text-brand-ink" aria-hidden="true" />
          <span className="min-w-0 flex-1 leading-5">{status}</span>
          <button type="button" onClick={cancel} className="shrink-0 font-semibold text-brand-ink hover:underline">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
