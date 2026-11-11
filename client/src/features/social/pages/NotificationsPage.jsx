import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Button from "../../../components/ui/Button";
import { read, create, update, remove, errorText } from "../api/socialApi";
import { Empty, ErrorNotice, Heading, Loading, panel, smallButton } from "../components/SocialUI";

const categories=[["friend","Friend requests"],["follow","Followers and follow requests"],["new_subscriber","Subscribers"],["video","New videos"],["message","Messages"],["reaction","Reactions"],["comment","Comments"],["mention","Mentions"]];
function destination(n) {
  if(n.type.startsWith("message")||n.type==="group_invite")return `/messages/${n.entityId}`;
  if(n.type.startsWith("video"))return `/videos/${n.entityId}`;
  if(n.type==="new_post"||n.type==="post_comment"||n.type==="comment")return `/posts/${n.entityId}`;
  if(n.type.startsWith("friend")||n.type.startsWith("follow"))return "/friends";
  return "/notifications";
}
export default function NotificationsPage(){
  const [prefsOpen,setPrefsOpen]=useState(false),[error,setError]=useState(""); const client=useQueryClient();
  const query=useInfiniteQuery({queryKey:["notifications","list"],queryFn:({pageParam})=>read("/notifications",{limit:40,...(pageParam?{before:pageParam}:{})}),initialPageParam:null,getNextPageParam:last=>last?.nextCursor||undefined,refetchInterval:60000});
  const prefs=useQuery({queryKey:["notificationPrefs"],queryFn:()=>read("/notification-preferences"),enabled:prefsOpen});
  const action=async(fn)=>{setError("");try{await fn();await client.invalidateQueries({queryKey:["notifications"]});}catch(e){setError(errorText(e));}};
  const toggle=async(category)=>{try{const excluded=prefs.data?.disabledCategories||[];const disabledCategories=excluded.includes(category)?excluded.filter(c=>c!==category):[...excluded,category];await update("/notification-preferences",{disabledCategories});client.invalidateQueries({queryKey:["notificationPrefs"]});}catch(e){setError(errorText(e));}};
  const notifications=query.data?.pages?.flatMap(p=>p.items)||[];
  const unread=query.data?.pages?.[0]?.unread||0;
  return <div className="space-y-4"><Heading title="Notifications" subtitle={`${unread} unread · Stay connected to your community.`} action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={()=>setPrefsOpen(v=>!v)}>Preferences</Button><Button size="sm" onClick={()=>action(()=>create("/notifications/read-all"))}>Mark all read</Button></div>}/><ErrorNotice error={error}/>
    {prefsOpen&&<section className={panel}><h2 className="mb-3 font-bold text-ink">Notification preferences</h2>{prefs.isPending?<Loading/>:prefs.error?<ErrorNotice error={prefs.error}/>:categories.map(([key,label])=><label key={key} className="flex cursor-pointer items-center justify-between border-b border-line py-2 text-sm"><span>{label}</span><input type="checkbox" checked={!prefs.data?.disabledCategories?.includes(key)} onChange={()=>toggle(key)}/></label>)}<p className="mt-2 text-xs text-ink-soft">In-app notifications update in real time. Browser notifications require a separate permission-based push setup.</p></section>}
    <section className={panel}>{query.isPending?<Loading/>:query.error?<ErrorNotice error={query.error}/>:!notifications.length?<Empty title="All caught up" description="Friend requests, messages, subscriptions and video updates will appear here."/>:notifications.map(n=><div key={n._id} className={`flex gap-3 border-b border-line py-3 ${!n.readAt?"bg-brand-soft/40":""}`}><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Bell size={18}/></div><div className="min-w-0 flex-1"><Link className="block break-words text-sm font-semibold text-ink hover:text-brand-ink" to={destination(n)} onClick={()=>action(()=>update(`/notifications/${n._id}/read`))}>{n.title}</Link>{n.detail&&<p className="mt-1 break-words text-xs text-ink-soft">{n.detail}</p>}<span className="mt-1 block text-xs text-ink-faint">{new Date(n.createdAt).toLocaleString()}</span></div><div className="flex flex-col gap-2">{!n.readAt&&<button aria-label="Mark notification as read" title="Mark read" onClick={()=>action(()=>update(`/notifications/${n._id}/read`))}><Check size={16}/></button>}<button aria-label="Delete notification" title="Delete" onClick={()=>action(()=>remove(`/notifications/${n._id}`))}><Trash2 size={16}/></button></div></div>)}{query.hasNextPage&&<div className="mt-4 text-center"><Button size="sm" variant="secondary" loading={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>Load older notifications</Button></div>}</section>
  </div>;
}
