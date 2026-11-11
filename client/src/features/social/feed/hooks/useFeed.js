import { useCallback, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { create, read, remove } from "../../api/socialApi";

/** Original Aevora feed API contract, now using persistent, permission-filtered posts. */
export function useFeed(tag = "") {
  const [audience, setAudience] = useState("everyone");
  const client = useQueryClient();
  const feed = useInfiniteQuery({
    queryKey: ["feed", "posts", audience, tag],
    queryFn: ({ pageParam }) => read("/feed/posts", { audience, limit: 16, ...(tag ? { tag } : {}), ...(pageParam ? { before: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => last?.nextCursor || undefined,
  });
  const invalidate = useCallback(() => client.invalidateQueries({ queryKey: ["feed", "posts"] }), [client]);
  const addPost = useCallback(async (input) => { const result = await create("/feed/posts", input); await invalidate(); return result; }, [invalidate]);
  const toggleLike = useCallback(async (post) => { await create(`/feed/posts/${post.id}/like`, { liked: !post.liked }); await invalidate(); }, [invalidate]);
  const toggleSave = useCallback(async (post) => { await create(`/feed/posts/${post.id}/save`, { saved: !post.saved }); await invalidate(); }, [invalidate]);
  const addComment = useCallback(async (id, text) => { await create(`/feed/posts/${id}/comments`, { text }); await invalidate(); }, [invalidate]);
  const removePost = useCallback(async (post) => { if (post.own) await remove(`/feed/posts/${post.id}`); else await create(`/feed/posts/${post.id}/hide`); await invalidate(); }, [invalidate]);
  return {
    posts: feed.data?.pages?.flatMap((page) => page.items || []) || [],
    audience, setAudience, addPost, toggleLike, toggleSave, addComment, removePost,
    loading: feed.isPending, error: feed.error, hasMore: feed.hasNextPage,
    loadMore: feed.fetchNextPage, loadingMore: feed.isFetchingNextPage, reload: feed.refetch,
  };
}
