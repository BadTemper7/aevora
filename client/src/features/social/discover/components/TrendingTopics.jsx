import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { read } from "../../api/socialApi";
import { formatCompactNumber } from "../../../../utils/formatNumber";

export default function TrendingTopics() {
  const query = useQuery({ queryKey: ["feed", "trending"], queryFn: () => read("/feed/trending"), staleTime: 60_000 });
  return <section aria-labelledby="trending-heading">
    <h2 id="trending-heading" className="px-1 text-base font-bold text-ink">Trending now</h2>
    {query.isPending ? <p className="mt-3 px-1 text-xs text-ink-soft">Finding topics...</p> : query.error ? <p className="mt-3 px-1 text-xs text-ink-soft">Topics are temporarily unavailable.</p> : !query.data?.length ? <p className="mt-3 px-1 text-xs text-ink-soft">Trending topics will appear as people share posts.</p> : <ul className="mt-2">{query.data.map(({ tag, posts }) => <li key={tag}><Link to={`/?tag=${encodeURIComponent(tag)}`} className="block rounded-xl px-3 py-2.5 hover:bg-raised"><p className="text-sm font-semibold text-ink">#{tag}</p><p className="text-[13px] text-ink-soft">{formatCompactNumber(posts)} posts</p></Link></li>)}</ul>}
  </section>;
}
