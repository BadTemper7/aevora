import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/hooks/useAuth";
import { errorText, read, update } from "../api/socialApi";
import { ErrorNotice, Heading, Loading, Tabs, panel, field, smallButton } from "../components/SocialUI";
export default function ModerationPage(){
  const {user}=useAuth(),[tab,setTab]=useState("open"),[error,setError]=useState("");const client=useQueryClient();
  const reports=useQuery({queryKey:["moderation",tab],queryFn:()=>read("/moderation/reports",{status:tab}),enabled:["admin","moderator"].includes(user?.role)});
  if(!["admin","moderator"].includes(user?.role))return <ErrorNotice error="Only authorized moderators can open this page."/>;
  const change=async(id,status)=>{const moderatorNote=window.prompt("Moderator note (optional)")||"";try{await update(`/moderation/reports/${id}`,{status,moderatorNote});client.invalidateQueries({queryKey:["moderation"]});}catch(e){setError(errorText(e));}};
  return <div><Heading title="Moderation reports" subtitle="Review accounts, videos, conversations and messages reported by users."/><Tabs tabs={[["open","Open"],["reviewing","Reviewing"],["resolved","Resolved"],["dismissed","Dismissed"]]} value={tab} onChange={setTab}/><ErrorNotice error={error}/><section className={panel}>{reports.isPending?<Loading/>:reports.error?<ErrorNotice error={reports.error}/>:!reports.data?.length?<p className="text-sm text-ink-soft">No reports in this queue.</p>:reports.data.map(r=><article key={r._id} className="space-y-2 border-b border-line py-4"><p className="text-sm font-semibold">{r.targetType}: {r.targetId}</p><p className="text-sm text-ink-soft">{r.reason}</p><p className="text-xs text-ink-faint">Reported {new Date(r.createdAt).toLocaleString()}</p><div className="flex flex-wrap gap-2">{["reviewing","resolved","dismissed"].map(status=><button key={status} className={smallButton} onClick={()=>change(r._id,status)}>{status}</button>)}</div></article>)}</section></div>;
}
