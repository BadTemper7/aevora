import { ArrowLeft } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/hooks/useAuth";
import Button from "../../../../components/ui/Button";
import { read, create, remove } from "../../api/socialApi";
import { ErrorNotice, Loading } from "../../components/SocialUI";
import PostCard from "../components/PostCard";

export default function PostDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["post", id], queryFn: () => read(`/feed/posts/${id}`), enabled: Boolean(id) });
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ["post", id] }), client.invalidateQueries({ queryKey: ["feed", "posts"] })]); };
  return <div className="space-y-4"><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"><ArrowLeft size={18}/> Back to feed</Link>
    {query.isPending ? <Loading label="Loading post..."/> : query.error ? <div className="space-y-3"><ErrorNotice error={query.error}/><Button variant="secondary" onClick={() => query.refetch()}>Retry</Button></div> : <PostCard
      post={query.data} currentUser={user}
      onToggleLike={async () => { await create(`/feed/posts/${id}/like`, { liked: !query.data.liked }); await refresh(); }}
      onToggleSave={async () => { await create(`/feed/posts/${id}/save`, { saved: !query.data.saved }); await refresh(); }}
      onAddComment={async (postId, text) => { await create(`/feed/posts/${postId}/comments`, { text }); await refresh(); }}
      onRemove={async () => { if (query.data.own) await remove(`/feed/posts/${id}`); else await create(`/feed/posts/${id}/hide`); window.location.assign("/"); }}
    />}
  </div>;
}
