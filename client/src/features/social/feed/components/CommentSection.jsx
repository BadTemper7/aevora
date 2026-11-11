import { SendHorizontal } from "lucide-react";
import { useState } from "react";

import Avatar from "../../../../components/ui/Avatar";
import { formatRelativeTime } from "../../../../utils/formatDate";

export default function CommentSection({ comments, currentUser, onAdd }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true); setError("");
    try { await onAdd(trimmed); setText(""); }
    catch (cause) { setError(cause?.response?.data?.error?.message || cause?.message || "Could not post comment."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 border-t border-line pt-4">
      {comments.length > 0 && (
        <ul className="mb-4 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar name={comment.author.name} size="sm" />
              <div className="min-w-0 rounded-2xl bg-raised px-3.5 py-2.5">
                <p className="text-[13px]">
                  <span className="font-semibold text-ink">
                    {comment.author.name}
                  </span>
                  <span className="ml-2 text-ink-soft">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                  {comment.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <Avatar name={currentUser?.name} size="sm" />
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Write a comment"
          placeholder="Write a comment"
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand/25"
        />
        <button
          type="submit"
          disabled={!text.trim() || busy}
          aria-label="Send comment"
          className="grid size-10 place-items-center rounded-xl text-brand-ink transition-colors hover:bg-brand-soft disabled:text-ink-faint disabled:hover:bg-transparent"
        >
          <SendHorizontal className="size-5" aria-hidden="true" />
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
