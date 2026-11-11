import { Bookmark, EyeOff, Heart, Link2, MessageCircle, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { read, errorText, mediaFile } from "../../api/socialApi";

import Avatar from "../../../../components/ui/Avatar";
import Dropdown, { DropdownItem } from "../../../../components/ui/Dropdown";
import { cn } from "../../../../utils/cn";
import { formatCompactNumber } from "../../../../utils/formatNumber";
import { formatRelativeTime } from "../../../../utils/formatDate";
import CommentSection from "./CommentSection";

const actionClass =
  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors hover:bg-raised";

function PostImages({ images }) {
  if (images.length === 0) return null;

  return (
    <div className={cn("mt-4 grid gap-1.5", images.length > 1 && "grid-cols-2")}>
      {images.map((image, index) => (
        <img
          key={image.id}
          src={image.url}
          alt="Photo shared in this post"
          className={cn(
            "w-full rounded-xl object-cover",
            images.length === 1 ? "max-h-[460px]" : "aspect-[4/3]",
            images.length === 3 && index === 0 && "col-span-2",
          )}
        />
      ))}
    </div>
  );
}

export default function PostCard({
  post,
  currentUser,
  onToggleLike,
  onToggleSave,
  onAddComment,
  onRemove,
}) {
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const client = useQueryClient();
  const comments = useInfiniteQuery({
    queryKey: ["post", "comments", post.id],
    queryFn: ({ pageParam }) => read(`/feed/posts/${post.id}/comments`, { limit: 30, ...(pageParam ? { before: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => last?.nextCursor || undefined,
    enabled: showComments,
  });
  const safeAction = async (operation) => {
    if (working) return;
    setWorking(true); setActionError("");
    try { await operation(); }
    catch (error) { setActionError(errorText(error)); }
    finally { setWorking(false); }
  };
  const submitComment = async (text) => {
    await onAddComment(post.id, text);
    await client.invalidateQueries({ queryKey: ["post", "comments", post.id] });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard can be blocked; nothing useful to show
    }
  };

  const isOwn = post.own || post.author.username === currentUser?.username;
  const images = post.images || (post.mediaIds || []).map((id) => ({ id, url: mediaFile(id) }));

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={post.author.name} size="md" />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-ink">{post.author.name}</h3>
            <p className="flex gap-2 truncate text-[13px] text-ink-soft">
              <span className="truncate">@{post.author.username}</span>
              <time dateTime={post.createdAt} className="shrink-0 text-ink-faint">
                {formatRelativeTime(post.createdAt)}
              </time>
            </p>
          </div>
        </div>

        <Dropdown
          trigger={({ toggle, props }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="More options"
              className="grid size-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-raised hover:text-ink"
              {...props}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
          )}
        >
          <DropdownItem icon={Link2} onClick={copyLink}>
            Copy link
          </DropdownItem>
          {isOwn ? (
            <DropdownItem icon={Trash2} danger onClick={() => safeAction(() => onRemove())}>
              Delete post
            </DropdownItem>
          ) : (
            <DropdownItem icon={EyeOff} onClick={() => safeAction(() => onRemove())}>
              Hide this post
            </DropdownItem>
          )}
        </Dropdown>
      </header>

      {post.content && (
        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-ink">
          {post.content}
        </p>
      )}

      <PostImages images={images} />

      <div className="mt-4 flex items-center justify-between text-[13px] text-ink-soft">
        <span>{formatCompactNumber(post.likes)} likes</span>
        <button
          type="button"
          onClick={() => setShowComments((open) => !open)}
          className="hover:text-ink hover:underline"
        >
          {formatCompactNumber(post.commentCount)} comments
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
        <button
          type="button"
          onClick={() => safeAction(() => onToggleLike())}
          disabled={working}
          aria-pressed={post.liked}
          className={cn(actionClass, post.liked ? "text-[#e0457b]" : "text-ink-soft hover:text-ink")}
        >
          <Heart
            key={post.liked ? "on" : "off"}
            className={cn("size-5", post.liked && "animate-pop")}
            fill={post.liked ? "currentColor" : "none"}
            aria-hidden="true"
          />
          Like
        </button>

        <button
          type="button"
          onClick={() => setShowComments((open) => !open)}
          aria-expanded={showComments}
          className={cn(actionClass, "text-ink-soft hover:text-ink")}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Comment
        </button>

        <button type="button" onClick={copyLink} className={cn(actionClass, "text-ink-soft hover:text-ink")}>
          <Share2 className="size-5" aria-hidden="true" />
          <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
        </button>

        <button
          type="button"
          onClick={() => safeAction(() => onToggleSave())}
          disabled={working}
          aria-pressed={post.saved}
          aria-label={post.saved ? "Remove from saved" : "Save post"}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl transition-colors hover:bg-raised",
            post.saved ? "text-brand-ink" : "text-ink-soft hover:text-ink",
          )}
        >
          <Bookmark className="size-5" fill={post.saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>

      {actionError && <p role="alert" className="mt-2 text-xs text-danger">{actionError}</p>}
      {showComments && <div>
        {comments.isPending ? <p role="status" className="mt-3 text-xs text-ink-soft">Loading comments...</p> : comments.error ? <p role="alert" className="mt-3 text-xs text-danger">{errorText(comments.error)}</p> : null}
        <CommentSection comments={comments.data?.pages?.flatMap((page) => page.items || []) || []} currentUser={currentUser} onAdd={submitComment}/>
        {comments.hasNextPage && <button type="button" disabled={comments.isFetchingNextPage} className="mt-3 text-xs font-semibold text-brand-ink" onClick={() => comments.fetchNextPage()}>{comments.isFetchingNextPage ? "Loading..." : "View older comments"}</button>}
      </div>}
    </article>
  );
}
