import { Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import EmptyState from "../../../../components/common/EmptyState";
import Button from "../../../../components/ui/Button";
import { useAuth } from "../../../auth/hooks/useAuth";
import { ErrorNotice, Loading } from "../../components/SocialUI";
import FeedHeader from "../components/FeedHeader";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";
import StoryRail from "../components/StoryRail";
import { useFeed } from "../hooks/useFeed";

/** Keeps the original Aevora home layout; no hardcoded stories or sample posts. */
export default function HomePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tag = searchParams.get("tag") || "";
  const feed = useFeed(tag);
  return (
    <div className="space-y-4">
      <FeedHeader audience={feed.audience} onAudienceChange={feed.setAudience}/>
      {tag && <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2 text-sm"><span>Showing posts tagged <strong>#{tag}</strong></span><button type="button" onClick={() => setSearchParams({})} className="font-semibold text-brand-ink">Clear filter</button></div>}
      <StoryRail user={user}/>
      <PostComposer user={user} onSubmit={feed.addPost}/>
      {feed.loading ? <Loading label="Loading your feed..."/> : feed.error ? <div className="space-y-3"><ErrorNotice error={feed.error}/><Button onClick={() => feed.reload()} variant="secondary">Retry feed</Button></div> : feed.posts.length ? (
        <ul className="space-y-4">{feed.posts.map((post) => <li key={post.id}><PostCard
          post={post}
          currentUser={user}
          onToggleLike={() => feed.toggleLike(post)}
          onToggleSave={() => feed.toggleSave(post)}
          onAddComment={feed.addComment}
          onRemove={() => feed.removePost(post)}
        /></li>)}</ul>
      ) : <EmptyState icon={Users} title="Nothing to show yet" description={feed.audience === "following" ? "Posts from people you follow will appear here." : "Be the first to share something with your community."} className="rounded-2xl border border-line bg-surface" action={feed.audience === "following" ? <Button variant="secondary" onClick={() => feed.setAudience("everyone")}>See everyone's posts</Button> : <Link className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand" to="/explore">Find people</Link>}/>}
      {feed.hasMore && <Button variant="secondary" fullWidth loading={feed.loadingMore} onClick={() => feed.loadMore()}>Load more posts</Button>}
    </div>
  );
}
