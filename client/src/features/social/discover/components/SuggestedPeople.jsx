import { useQuery } from "@tanstack/react-query";
import { read } from "../../../social/api/socialApi";
import { Person, ErrorNotice, useAction } from "../../../social/components/SocialUI";

export default function SuggestedPeople() {
  const query=useQuery({queryKey:["people","suggestions"],queryFn:()=>read("/users/suggestions"),staleTime:60000});
  const act=useAction();
  return <section aria-labelledby="suggestions-heading"><h2 id="suggestions-heading" className="px-1 text-base font-bold text-ink">People you may know</h2>
    <div className="mt-3 space-y-1">{query.isPending?<p className="px-1 text-xs text-ink-soft">Finding people...</p>:query.error?<ErrorNotice error={query.error}/>:!query.data?.length?<p className="px-1 text-xs text-ink-soft">More suggestions will appear as your network grows.</p>:query.data.slice(0,5).map(user=><Person key={user.id} user={user} detail={user.mutualCount?`${user.mutualCount} mutual`:undefined} actions={<button className="rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-ink disabled:opacity-50" disabled={act.pending} onClick={()=>act.run(`/friends/${user.id}/request`)}>Add</button>}/>)}</div><ErrorNotice error={act.error}/>
  </section>;
}
