import { LockKeyhole, Shield, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../../components/ui/Button";
import { read, update, remove, errorText } from "../api/socialApi";
import { ErrorNotice, Heading, Loading, Person, panel, field, smallButton } from "../components/SocialUI";
const controls=[
  ["messagePolicy","Who Can Message Me?",[["friends","Friends only"],["anyone","Anyone (others go to requests)"],["custom","Custom"]]],
  ["profileVisibility","Who Can View My Profile?",[["public","Everyone"],["followers","Followers"],["friends","Friends"],["private","Only me"]]],
  ["friendRequestAudience","Who Can Send Friend Requests?",[["everyone","Everyone"],["followers","Followers"],["nobody","Nobody"]]],
  ["followAudience","Who Can Follow Me?",[["everyone","Everyone"],["nobody","Nobody"]]],
  ["communityInviteAudience","Who Can Invite Me to Communities?",[["everyone","Everyone"],["friends","Friends only"],["nobody","Nobody"]]],
  ["friendsListVisibility","Who Can View My Friends List?",[["public","Everyone"],["friends","Friends"],["private","Only me"]]],
  ["onlineVisibility","Who Can See My Online Status?",[["everyone","Everyone"],["friends","Friends"],["nobody","Nobody"]]],
  ["lastActiveVisibility","Who Can See My Last Active Time?",[["everyone","Everyone"],["friends","Friends"],["nobody","Nobody"]]],
  ["readReceiptsVisibility","Who Can See My Read Receipts?",[["everyone","Everyone"],["friends","Friends"],["nobody","Nobody"]]],
  ["commentAudience","Who Can Comment on My Videos?",[["everyone","Everyone"],["followers","Followers"],["friends","Friends"],["nobody","Nobody"]]],
  ["mentionAudience","Who Can Mention or Tag Me?",[["everyone","Everyone"],["followers","Followers"],["friends","Friends"],["nobody","Nobody"]]],
  ["videoDefaultVisibility","Default Video Audience",[["public","Public"],["friends","Friends only"],["subscribers","Subscribers only"],["private","Only me"]]],
];
export default function PrivacyPage(){
  const client=useQueryClient(),data=useQuery({queryKey:["privacy"],queryFn:()=>read("/privacy")}),blocks=useQuery({queryKey:["blocks"],queryFn:()=>read("/blocks")});
  const [draft,setDraft]=useState(null),[search,setSearch]=useState(""),[error,setError]=useState(""),[success,setSuccess]=useState(""),[saving,setSaving]=useState(false);
  const users=useQuery({queryKey:["people","search",search],queryFn:()=>read("/users/search",{q:search}),enabled:search.trim().length>=2});
  useEffect(()=>{if(data.data)setDraft(data.data);},[data.data]);
  const set=(name,value)=>setDraft(p=>({...p,[name]:value}));
  const save=async()=>{setSaving(true);setError("");setSuccess("");try{const payload=Object.fromEntries([...controls.map(([key])=>[key,draft[key]]),...(["privateProfile","allowFriends","allowFollowers","allowSubscribers","allowUsers","denyUsers"].map(key=>[key,draft[key]]))].filter(([,val])=>val!==undefined));await update("/privacy",payload);await client.invalidateQueries({queryKey:["privacy"]});setSuccess("Your privacy settings have been saved.");}catch(e){setError(errorText(e));}finally{setSaving(false);}};
  const toggleList=(key,id)=>{setDraft(p=>({...p,[key]:p[key]?.includes(id)?p[key].filter(i=>i!==id):[...(p[key]||[]),id]}));};
  return <div className="space-y-5"><Heading title="Privacy & Safety" subtitle="Control connections, messages, visibility and account safety."/><ErrorNotice error={error}/>{success&&<p role="status" className="rounded-xl bg-brand-soft p-3 text-sm text-success">{success}</p>}{data.isPending||!draft?<Loading/>:<><section className={`${panel} space-y-4`}><div className="flex items-center gap-2"><Shield size={20} className="text-brand-ink"/><h2 className="font-bold text-ink">Privacy controls</h2></div>{controls.map(([key,label,options])=><label key={key} className="flex flex-col gap-2 border-b border-line py-2 text-sm md:flex-row md:items-center md:justify-between"><span className="font-semibold text-ink">{label}</span><select value={draft[key]||options[0][0]} onChange={e=>set(key,e.target.value)} className={`${field} md:max-w-[275px]`}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>)}<label className="flex items-center justify-between text-sm"><span>Private profile (approve follow requests)</span><input type="checkbox" checked={Boolean(draft.privateProfile)} onChange={e=>set("privateProfile",e.target.checked)}/></label></section>
      {draft.messagePolicy==="custom" && <section className={`${panel} space-y-3`}><h2 className="font-bold">Custom messaging rules</h2>{[["allowFriends","Allow friends"],["allowFollowers","Allow followers"],["allowSubscribers","Allow subscribers"]].map(([key,label])=><label key={key} className="flex items-center justify-between text-sm"><span>{label}</span><input type="checkbox" checked={Boolean(draft[key])} onChange={e=>set(key,e.target.checked)}/></label>)}<label className="block text-sm font-semibold">Search people for exceptions<input className={`${field} mt-2`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Type username"/></label>{users.data?.map(u=><div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2" key={u.id}><span className="text-sm">@{u.username}</span><div className="flex gap-2"><button className={smallButton} onClick={()=>toggleList("allowUsers",u.id)}>{draft.allowUsers?.includes(u.id)?"Remove allow":"Always allow"}</button><button className={smallButton} onClick={()=>toggleList("denyUsers",u.id)}>{draft.denyUsers?.includes(u.id)?"Remove deny":"Always deny"}</button></div></div>)}<p className="text-xs text-ink-soft">Deny overrides allow. Blocking always takes priority.</p><div className="text-xs text-ink-soft">Allowed user IDs: {draft.allowUsers?.length||0} · Denied user IDs: {draft.denyUsers?.length||0}</div></section>}
      <Button fullWidth loading={saving} onClick={save}>Save privacy settings</Button></>}
    <section className={panel}><h2 className="mb-3 flex items-center gap-2 font-bold text-ink"><UserX size={19}/> Blocked users</h2>{blocks.isPending?<Loading/>:blocks.error?<ErrorNotice error={blocks.error}/>:!blocks.data?.length?<p className="text-sm text-ink-soft">You haven't blocked anyone.</p>:blocks.data.map(r=><Person key={r._id} user={r.user} actions={<button className={smallButton} onClick={async()=>{try{await remove(`/blocks/${r.user.id}`);client.invalidateQueries({queryKey:["blocks"]});}catch(e){setError(errorText(e));}}}>Unblock</button>}/>)}</section>
  </div>;
}
