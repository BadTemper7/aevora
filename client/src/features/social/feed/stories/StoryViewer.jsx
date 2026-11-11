import { useCallback,useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft,ChevronRight,LoaderCircle,Pause,Play,Trash2,Volume2,VolumeX,X } from 'lucide-react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import Avatar from '../../../../components/ui/Avatar';
import { create,read,remove,errorText,mediaFile } from '../../api/socialApi';
import StoryCanvas from './StoryCanvas';

export default function StoryViewer({ stories, initialId, user, onClose, onAddYours }) {
  const ordered=[...stories].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)||a.slideIndex-b.slideIndex);
  const [index,setIndex]=useState(Math.max(0,ordered.findIndex(s=>s.id===initialId)));
  const [elapsed,setElapsed]=useState(0);
  const [paused,setPaused]=useState(false);
  const [sound,setSound]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [authorizedKey,setAuthorizedKey]=useState('');
  const audioRef=useRef(null);const videoRef=useRef(null);
  useEffect(()=>()=>{audioRef.current?.pause();videoRef.current?.pause();},[]);const lastTick=useRef(performance.now());
  const client=useQueryClient();
  const story=ordered[Math.min(index,ordered.length-1)];
  const currentAuthKey=`${user?.id||''}:${story?.id||''}`;
  const authorized=!!user?.id && !!story?.id && authorizedKey===currentAuthKey;
  const duration=Math.max(3,story?.duration||10);
  const results=useQuery({queryKey:['stories',user?.id,'stickers',story?.id],queryFn:()=>read(`/stories/${story.id}/sticker-results`),enabled:authorized,staleTime:2000});
  const advance=useCallback((delta=1)=>{setElapsed(0);setPaused(false);setError('');setIndex(x=>{const target=x+delta;if(target>=ordered.length||target<0){onClose?.();return x;}return target;});},[ordered.length,onClose]);
  // Do not render a cached story or load its media before a fresh server
  // authorization succeeds. Recheck when either the story or user changes.
  useEffect(()=>{
    if(!story?.id || !user?.id)return;
    let active=true;
    const key=`${user.id}:${story.id}`;
    create(`/stories/${story.id}/view`)
      .then(()=>{if(active){setAuthorizedKey(key);void client.invalidateQueries({queryKey:['stories',user.id],exact:true});}})
      .catch(()=>{if(active){setAuthorizedKey('');onClose?.();}});
    return()=>{active=false;};
  },[story?.id,user?.id,client]);
  useEffect(()=>{if(!authorized)return;setElapsed(0);setPaused(false);lastTick.current=performance.now();const audio=audioRef.current;if(audio&&story?.music?.track){audio.currentTime=story.music.start||0;audio.volume=story.music.volume??.7;if(sound)audio.play().catch(()=>setSound(false));}const video=videoRef.current;if(video){video.currentTime=story?.effects?.trimStart||0;video.volume=story?.music?.originalVolume??1;video.muted=!sound;video.play().catch(()=>{});}},[story?.id,authorized]);
  useEffect(()=>{if(!story||!authorized)return undefined;let last=performance.now();const timer=setInterval(()=>{const now=performance.now();const delta=(now-last)/1000;last=now;if(!paused){setElapsed(t=>Math.min(duration,t+Math.min(delta,.5)));}},100);return()=>clearInterval(timer);},[story?.id,duration,paused,authorized]);
  useEffect(()=>{if(elapsed>=duration-.05&&!paused)advance(1);},[elapsed,duration,paused,advance]);
  useEffect(()=>{const onKey=e=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight')advance(1);if(e.key==='ArrowLeft')advance(-1);if(e.key===' ') {e.preventDefault();setPaused(v=>!v);}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[advance,onClose]);
  useEffect(()=>{const audio=audioRef.current,video=videoRef.current;if(audio){if(paused)audio.pause();else if(sound)audio.play().catch(()=>{});}if(video){if(paused)video.pause();else video.play().catch(()=>{});}},[paused,sound,story?.id]);
  const toggleSound=()=>{setSound(v=>{const next=!v;if(audioRef.current){audioRef.current.currentTime=Math.min(Number(story.music?.track?.duration||3600),Number(story.music?.start||0)+elapsed);audioRef.current.volume=story.music?.volume??.7;audioRef.current.muted=!next;if(next)audioRef.current.play().catch(()=>{});else audioRef.current.pause();}if(videoRef.current)videoRef.current.muted=!next;return next;});};
  const respond=async(layer,payload)=>{
    if(payload.type==='add_yours'){onAddYours?.({storyId:story.id,stickerId:layer.id,prompt:layer.prompt});return;}
    setBusy(true);setError('');try{await create(`/stories/${story.id}/stickers/${layer.id}/respond`,payload);await client.invalidateQueries({queryKey:['stories',user?.id,'stickers',story.id]});}catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  const deleteCurrent=async()=>{if(busy)return;setBusy(true);try{await remove(`/stories/${story.id}`);await client.invalidateQueries({queryKey:['stories']});advance(1);}catch(e){setError(errorText(e));}finally{setBusy(false);}};
  if(!story)return null;
  if(!authorized)return createPortal(<section role="dialog" aria-modal="true" aria-label="Verifying story access" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 text-white"><p role="status" className="text-sm">Checking story access...</p></section>,document.body);
  const percent=Math.min(100,elapsed/duration*100);
  return createPortal(<section role="dialog" aria-modal="true" aria-label="AEVORA story viewer" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-2 text-white sm:p-5">
    <div className="relative flex h-full max-h-[95dvh] w-full max-w-[480px] flex-col">
      <div className="mb-2 flex gap-1" aria-label="Story progress">{ordered.map((s,i)=><div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><div className="h-full bg-white" style={{width:`${i<index?100:i===index?percent:0}%`}}/></div>)}</div>
      <header className="mb-2 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><Avatar name={story.author?.name} src={story.author?.image} size="sm"/><span className="truncate text-sm font-bold">{story.author?.name||'AEVORA member'}</span><span className="text-xs text-white/60">{new Date(story.createdAt).toLocaleString()}</span></div><div className="flex gap-1"><button type="button" aria-label={paused?'Resume story':'Pause story'} onClick={()=>setPaused(p=>!p)} className="rounded-full bg-white/10 p-2">{paused?<Play size={17}/>:<Pause size={17}/>}</button><button type="button" onClick={toggleSound} aria-label={sound?'Mute story':'Unmute story'} className="rounded-full bg-white/10 p-2">{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>{story.ownerId===user?.id&&<button type="button" title="Delete story" onClick={deleteCurrent} className="rounded-full bg-white/10 p-2"><Trash2 size={17}/></button>}<button type="button" aria-label="Close stories" onClick={onClose} className="rounded-full bg-white/10 p-2"><X size={18}/></button></div></header>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <StoryCanvas slide={story} mediaUrl={story.mediaId?mediaFile(story.mediaId):null} videoRef={videoRef} muted={!sound} onVideoTime={e=>{if(e.currentTarget.currentTime>=duration)e.currentTarget.pause();if(sound&&story.music?.track&&audioRef.current){const expected=Number(story.music.start||0)+e.currentTarget.currentTime;if(Math.abs(audioRef.current.currentTime-expected)>.6)audioRef.current.currentTime=expected;}}} onVideoEnd={()=>advance(1)} results={results.data||[]} onInteract={respond}/>
        {index>0&&<button type="button" aria-label="Previous story" onClick={()=>advance(-1)} className="absolute left-0 top-1/2 z-30 rounded-full bg-black/40 p-2"><ChevronLeft size={24}/></button>}
        <button type="button" aria-label="Next story" onClick={()=>advance(1)} className="absolute right-0 top-1/2 z-30 rounded-full bg-black/40 p-2"><ChevronRight size={24}/></button>
      </div>
      {story.music?.track&&<audio key={story.id} ref={audioRef} preload="metadata" src={mediaFile(story.music.track.mediaId)} onLoadedMetadata={e=>{e.currentTarget.currentTime=story.music.start||0;}} onTimeUpdate={e=>{const audio=e.currentTarget;const pos=audio.currentTime-Number(story.music.start||0);const fadeIn=story.music.fadeIn||0,fadeOut=story.music.fadeOut||0;const factor=Math.min(1,fadeIn?Math.max(0,pos/fadeIn):1,fadeOut?Math.max(0,(duration-pos)/fadeOut):1);audio.volume=Math.min(1,Math.max(0,(story.music.volume??.7)*factor));if(pos>=duration)audio.pause();}}/>}
      {story.music?.track&&!sound&&<p className="mt-1 text-center text-xs text-white/60">Tap the sound icon to hear {story.music.track.title}.</p>}
      <footer className="mt-2 text-center text-xs text-white/50">Story expires {new Date(story.expiresAt).toLocaleString()} · {index+1} of {ordered.length}</footer>
      {error&&<div role="alert" className="mt-2 rounded-lg bg-red-950 px-3 py-2 text-sm">{error}</div>}
      {busy&&<span role="status" className="absolute bottom-12 right-2"><LoaderCircle size={18} className="animate-spin"/></span>}
    </div>
  </section>,document.body);
}
