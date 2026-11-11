import { Search, UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { read } from "../api/socialApi";
import { Empty, ErrorNotice, Heading, Loading, Person, Tabs, field, panel, useAction } from "../components/SocialUI";

export default function ExplorePage() {
  const [params] = useSearchParams();
  const [value,setValue] = useState(params.get("q")||"");
  const [query,setQuery] = useState(params.get("q")?.trim().toLowerCase()||"");
  const { data:people,isPending,error } = useQuery({ queryKey:["people","search",query], queryFn:()=>read("/users/search",{q:query}), enabled:query.length>=2 });
  const suggests=useQuery({queryKey:["people","suggestions"],queryFn:()=>read("/users/suggestions")});
  const act=useAction();
  return <div className="space-y-5"><Heading title="Discover people" subtitle="Find friends, creators, and accounts by their unique username." />
    <form className={panel} onSubmit={(event)=>{event.preventDefault();setQuery(value.trim().toLowerCase());}}><label htmlFor="peopleSearch" className="mb-2 block text-sm font-semibold text-ink">Search by username</label><div className="flex gap-2"><input id="peopleSearch" autoComplete="off" value={value} onChange={(event)=>{setValue(event.target.value); if (event.target.value.trim().length>=2) setQuery(event.target.value.trim().toLowerCase());else setQuery("");}} placeholder="Type @username" className={field}/><button type="submit" aria-label="Search people" className="rounded-xl bg-brand px-4 text-on-brand"><Search size={19}/></button></div></form>
    {act.error && <ErrorNotice error={act.error}/>}
    {query.length >=2 && <section className={panel}><h2 className="mb-2 text-base font-bold text-ink">Search results</h2>{isPending ? <Loading/> : error ? <ErrorNotice error={error}/> : people?.length ? people.map((u)=><Person key={u.id} user={u} actions={<Link className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand" to={`/u/${u.username}`}>View profile</Link>}/>) : <p className="py-5 text-center text-sm text-ink-soft">No matching usernames. Try another search.</p>}</section>}
    <section className={panel}><h2 className="mb-2 text-base font-bold text-ink">People you may know</h2><p className="mb-3 text-xs text-ink-soft">Suggestions include people with mutual friends.</p>{suggests.isPending ? <Loading/> : suggests.error ? <ErrorNotice error={suggests.error}/> : !suggests.data?.length ? <p className="py-4 text-sm text-ink-soft">No suggestions yet. Search for a username to connect.</p> : suggests.data.map((u)=><Person key={u.id} user={u} detail={u.mutualCount?`${u.mutualCount} mutual friends`:"New to your network"} actions={<button type="button" disabled={act.pending} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand disabled:opacity-50" onClick={()=>act.run(`/friends/${u.id}/request`)}>Add friend</button>}/>)}</section>
  </div>;
}
