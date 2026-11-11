import { Bookmark, Clapperboard, Heart, MessageCircle, Play, Send, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Avatar from "../../../components/ui/Avatar";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../auth/hooks/useAuth";
import { create, errorText, mediaFile, read, remove, replace, update } from "../api/socialApi";
import MediaPicker from "../components/MediaPicker";
import { Empty, ErrorNotice, Heading, Loading, Tabs, field, panel, smallButton } from "../components/SocialUI";

const tabs = [["subscriptions","Subscriptions"],["following","Following"],["latest","Discover"],["saved","Saved"],["history","Watch history"],["mine","My videos"]];
function CommentList({ video }) {
  const [expanded,setExpanded]=useState(false),[text,setText]=useState(""),[error,setError]=useState("");
  const query=useQuery({queryKey:["videoComments",video.id],queryFn:()=>read(`/videos/${video.id}/comments`),enabled:expanded});
  const client=useQueryClient(); const action=useMutation({mutationFn:()=>create(`/videos/${video.id}/comments`,{text}),onSuccess:()=>{setText("");setError("");client.invalidateQueries({queryKey:["videoComments",video.id]});client.invalidateQueries({queryKey:["videos"]});},onError:e=>setError(errorText(e))});
  return <div className="mt-3 border-t border-line pt-3"><button type="button" className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink" onClick={()=>setExpanded(v=>!v)}><MessageCircle size={15}/> {video.comments} comments {expanded?"(hide)":""}</button>{expanded&&<><div className="mt-3 max-h-72 space-y-3 overflow-y-auto">{query.isPending?<p className="text-xs text-ink-soft">Loading comments...</p>:query.error?<ErrorNotice error={query.error}/>:query.data?.length ? query.data.map(c=><p key={c._id} className="break-words text-sm text-ink"><b>{c.author?.username||"User"}:</b> {c.text}</p>) : <p className="text-xs text-ink-soft">No comments yet.</p>}</div><form onSubmit={e=>{e.preventDefault();if(text.trim())action.mutate();}} className="mt-3 flex gap-2"><input aria-label="Write a video comment" value={text} onChange={e=>setText(e.target.value)} className={field} placeholder="Write a comment..." maxLength={1500}/><button type="submit" disabled={!text.trim()||action.isPending} className="rounded-xl bg-brand px-3 text-on-brand disabled:opacity-50"><Send size={16}/></button></form><ErrorNotice error={error}/></>}</div>;
}
function VideoCard({ video }) {
  const {user}=useAuth(); const client=useQueryClient();const [error,setError]=useState(""),[linkCopied,setLinkCopied]=useState(false);
  const [playbackError,setPlaybackError]=useState(false),[buffering,setBuffering]=useState(false),[playerKey,setPlayerKey]=useState(0);
  const interact=useMutation({mutationFn:({action,enabled})=>replace(`/videos/${video.id}/interaction`,{action,enabled}),onSuccess:()=>client.invalidateQueries({queryKey:["videos"]}),onError:e=>setError(errorText(e))});
  const markWatch=()=>create(`/videos/${video.id}/watch`,{seconds:1}).then(()=>client.invalidateQueries({queryKey:["videos"]})).catch(()=>{});
  const share=async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/videos/${video.id}`);setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2500);}catch{setError("Could not copy the link.");}};
  const reportVideo=async()=>{const reason=window.prompt("Why are you reporting this video? (at least 8 characters)");if(!reason)return;try{await create("/reports",{targetType:"video",targetId:video.id,reason});setError("Report submitted to moderators.");}catch(e){setError(errorText(e));}};
  const deleteVideo=async()=>{if(!window.confirm("Delete this video permanently?"))return;try{await remove(`/videos/${video.id}`);client.invalidateQueries({queryKey:["videos"]});}catch(e){setError(errorText(e));}};
  const editVideo=async()=>{const title=window.prompt("Edit video title",video.title);if(!title?.trim())return;try{await update(`/videos/${video.id}`,{title:title.trim()});client.invalidateQueries({queryKey:["videos"]});}catch(e){setError(errorText(e));}};
  return <article className={`${panel} space-y-3`}><div className="flex items-center gap-2"><Link to={`/u/${video.author?.username}`}><Avatar name={video.author?.name} src={video.author?.image} size="sm" /></Link><div className="min-w-0 flex-1"><Link to={`/u/${video.author?.username}`} className="block truncate text-sm font-semibold text-ink">{video.author?.name||"Creator"}</Link><p className="text-xs text-ink-soft">@{video.author?.username} · {new Date(video.createdAt).toLocaleDateString()} · {video.visibility}</p></div>{video.ownerId===user?.id && <><button className={smallButton} onClick={editVideo}>Edit</button><button aria-label="Delete video" className="text-danger" onClick={deleteVideo}><Trash2 size={17}/></button></>}</div><div><h2 className="text-base font-bold text-ink">{video.title}</h2>{video.description && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{video.description}</p>}</div><div className="relative"><video key={`${video.id}-${playerKey}`} controls playsInline preload="metadata" poster={mediaFile(video.mediaId,true)} onPlay={markWatch} onWaiting={()=>setBuffering(true)} onPlaying={()=>setBuffering(false)} onCanPlay={()=>setBuffering(false)} onError={()=>{setBuffering(false);setPlaybackError(true);}} className="max-h-[420px] w-full rounded-xl bg-black" src={mediaFile(video.mediaId)}/>{buffering && !playbackError && <span role="status" className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-1 text-xs text-white">Loading video...</span>}{playbackError && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">Video could not be played. <button className="ml-2 font-bold underline" onClick={()=>{setPlaybackError(false);setPlayerKey(n=>n+1);}}>Retry playback</button></div>}</div><div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft"><span>{video.viewCount} views</span><span>· {video.likes} likes</span></div><div className="flex flex-wrap gap-2"><button className={smallButton} disabled={interact.isPending} aria-pressed={video.liked} onClick={()=>interact.mutate({action:"liked",enabled:!video.liked})}><Heart size={15} className="mr-1 inline" fill={video.liked?"currentColor":"none"}/> {video.liked?"Liked":"Like"}</button><button className={smallButton} disabled={interact.isPending} aria-pressed={video.saved} onClick={()=>interact.mutate({action:"saved",enabled:!video.saved})}><Bookmark size={15} className="mr-1 inline" fill={video.saved?"currentColor":"none"}/> {video.saved?"Saved":"Save"}</button><button className={smallButton} onClick={share}><Share2 size={15} className="mr-1 inline"/>{linkCopied?"Copied!":"Share"}</button></div>{video.ownerId!==user?.id&&<button className="text-xs text-ink-faint underline" onClick={reportVideo}>Report video</button>}<CommentList video={video}/><ErrorNotice error={error}/></article>;
}
export function VideoList({ tab = "latest", ownerId, singleId }) {
  const query=useInfiniteQuery({
    queryKey:["videos",singleId||tab,ownerId],
    queryFn:({pageParam})=>singleId?read(`/videos/${singleId}`).then(v=>({items:[v],nextCursor:null})):read("/videos",{tab,...(ownerId?{ownerId}:{}),...(pageParam?{before:pageParam}:{})}),
    initialPageParam:null,
    getNextPageParam:last=>last?.nextCursor||undefined,
    refetchOnWindowFocus:false,
  });
  if(query.isPending)return <Loading label="Loading videos..."/>;
  if(query.error)return <ErrorNotice error={query.error}/>;
  const items=query.data?.pages?.flatMap(p=>p.items)||[];
  return <div className="space-y-4">{!items.length&&!query.hasNextPage&&<Empty title="No videos here yet" description={tab==="subscriptions"?"Subscribe to creators to see new videos here.":"Published videos appear here once creators upload them."}/>}{items.map(v=><VideoCard key={v.id} video={v}/>)}{query.hasNextPage&&<div className="flex justify-center"><Button variant="secondary" disabled={query.isFetchingNextPage} loading={query.isFetchingNextPage} onClick={()=>query.fetchNextPage()}>Load more videos</Button></div>}</div>;
}
export function VideoUpload() {
  const [title,setTitle]=useState(""),[description,setDescription]=useState(""),[visibility,setVisibility]=useState("public"),[media,setMedia]=useState(null),[error,setError]=useState(""),[success,setSuccess]=useState("");const client=useQueryClient();
  const publish=useMutation({mutationFn:()=>create("/videos",{title,description,visibility,mediaId:media.id}),onSuccess:()=>{setSuccess("Your video is published.");setTitle("");setDescription("");setMedia(null);client.invalidateQueries({queryKey:["videos"]});},onError:e=>setError(errorText(e))});
  return <form className={`${panel} space-y-3`} onSubmit={e=>{e.preventDefault();setError("");setSuccess("");if(media&&title.trim())publish.mutate();}}><h2 className="text-base font-bold text-ink">Upload a video</h2><MediaPicker purpose="video" label="Choose video or drop it here" accept="video/mp4,video/webm,video/quicktime" onReady={setMedia}/><label className="block text-sm font-medium text-ink">Title<input className={`${field} mt-1`} value={title} maxLength={140} onChange={e=>setTitle(e.target.value)} placeholder="Give your video a title"/></label><label className="block text-sm font-medium text-ink">Description<textarea className={`${field} mt-1 min-h-20`} value={description} maxLength={2000} onChange={e=>setDescription(e.target.value)}/></label><label className="block text-sm font-medium text-ink">Who can watch?<select className={`${field} mt-1`} value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="public">Public</option><option value="friends">Friends only</option><option value="subscribers">Subscribers only</option><option value="private">Only me</option></select></label><Button type="submit" loading={publish.isPending} disabled={!title.trim()||!media}>Publish video</Button>{success&&<p role="status" className="text-sm text-success">{success}</p>}<ErrorNotice error={error}/></form>;
}
function SubscribedCreators(){
  const client=useQueryClient();
  const query=useQuery({queryKey:["subscriptions"],queryFn:()=>read("/subscriptions")});
  const [error,setError]=useState("");
  const toggle=async(row)=>{try{await update(`/subscriptions/${row.creator}/notifications`,{enabled:!row.notificationsEnabled});client.invalidateQueries({queryKey:["subscriptions"]});}catch(e){setError(errorText(e));}};
  if(query.isPending)return null;
  return <div className={`${panel} mb-4`}><h2 className="mb-3 text-base font-bold text-ink">Subscribed creators</h2>{!query.data?.length?<p className="text-sm text-ink-soft">Subscribe to creators from their profiles to receive new video updates.</p>:query.data.map(row=><div key={row.creator} className="flex items-center justify-between gap-2 border-b border-line py-2"><Link to={`/u/${row.user?.username}`} className="truncate text-sm font-semibold text-ink">@{row.user?.username}</Link><button className={smallButton} title="Toggle new video notifications" aria-pressed={row.notificationsEnabled} onClick={()=>toggle(row)}>{row.notificationsEnabled?"Notifications on":"Notifications off"}</button></div>)}<ErrorNotice error={error}/></div>;
}
export default function VideosPage() {
  const [params,setParams]=useSearchParams();
  const tab=tabs.some(([key])=>key===params.get("tab"))?params.get("tab"):"subscriptions";
  const setTab=(next)=>setParams({tab:next});
  return <div><Heading title="Videos & subscriptions" subtitle="Videos from subscribed creators, followed people, and the community."/><Tabs value={tab} onChange={setTab} tabs={tabs}/>{tab==="subscriptions"&&<SubscribedCreators/>}{tab==="mine"&&<div className="mb-5"><VideoUpload/></div>}<VideoList tab={tab}/></div>;
}
export function VideoDetailPage(){const {id}=useParams();return <div><Heading title="Video" subtitle="Watch and join the conversation"/><VideoList singleId={id}/></div>;}
