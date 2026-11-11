import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { read, update, errorText } from "../api/socialApi";
import { Empty, ErrorNotice, Heading, Loading, Person, Tabs, smallButton, useAction, panel } from "../components/SocialUI";

const tabs = [["friends","Friends"],["received","Received requests"],["sent","Sent requests"],["followers","Followers"],["following","Following"],["requests","Follow requests"]];
export default function FriendsPage() {
  const [params, setParams] = useSearchParams();
  const current = params.get("tab");
  const tab = tabs.some(([key]) => key === current) ? current : "friends";
  const setTab = value => setParams(value === "friends" ? {} : { tab: value });
  const act=useAction(); const client=useQueryClient();
  const query=useQuery({ queryKey:["friends",tab], queryFn:()=>read(tab==="friends" || tab==="received" || tab==="sent" ? "/friends":"/follows",{tab}) });
  const rows=query.data||[];
  const actions=(row)=>{
    const id=row.user?.id;
    if(tab==="friends")return <button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/friends/${id}`,null,"delete")}>Remove</button>;
    if(tab==="received") return <><button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/friends/${id}/respond`,{action:"accept"})}>Accept</button><button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/friends/${id}/respond`,{action:"decline"})}>Decline</button></>;
    if(tab==="sent") return <button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/friends/${id}`,null,"delete")}>Cancel request</button>;
    if(tab==="requests") return <><button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/follows/${id}/respond`,{action:"accept"})}>Approve</button><button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/follows/${id}/respond`,{action:"decline"})}>Decline</button></>;
    if(tab==="followers")return <button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/followers/${id}`,null,"delete")}>Remove follower</button>;
    return <><button className={smallButton} disabled={act.pending} onClick={()=>act.run(`/follows/${id}`,null,"delete")}>Unfollow</button><button className={smallButton} aria-pressed={row.notificationsEnabled} title="Toggle followed account notifications" onClick={async()=>{try{await update(`/follows/${id}/notifications`,{enabled:!row.notificationsEnabled});client.invalidateQueries({queryKey:["friends"]});}catch(e){act.setError(errorText(e));}}}>{row.notificationsEnabled?"Updates on":"Updates off"}</button></>;
  };
  return <div><Heading title="Friends & connections" subtitle="Manage mutual friendships and independent follow relationships." action={<Link to="/explore" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand">Find people</Link>}/><Tabs tabs={tabs} value={tab} onChange={setTab}/>{act.error && <ErrorNotice error={act.error}/>}<div className={panel}>{query.isPending ? <Loading/> : query.error ? <ErrorNotice error={query.error}/> : rows.length ? rows.map((r)=><Person key={r._id||r.user?.id} user={r.user} detail={r.status === "pending" ? "Pending" : undefined} actions={actions(r)}/>) : <Empty title="Nothing here yet" description={tab === "friends" ? "Search usernames and send a friend request to connect." : "Your requests and connections will appear here."}/>}</div></div>;
}
