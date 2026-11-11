import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2, ExternalLink } from 'lucide-react';
import { mediaFile } from '../../api/socialApi';

const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));
function Countdown({ date }) {
  const [now,setNow] = useState(Date.now());
  useEffect(()=>{ const timer=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(timer); }, []);
  const remaining=Math.max(0,Math.ceil((new Date(date).getTime()-now)/1000));
  const days=Math.floor(remaining/86400),hours=Math.floor(remaining%86400/3600),minutes=Math.floor(remaining%3600/60),seconds=remaining%60;
  return <div className="text-center text-white"><div className="text-lg font-bold tabular-nums">{days ? `${days}d ` : ''}{String(hours).padStart(2,'0')}:{String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}</div></div>;
}
function InteractiveLayer({ layer, onInteract, response, isEditing }) {
  const [answer,setAnswer] = useState('');
  const hasResponse = response?.mine;
  switch(layer.type) {
    case 'text': return <div className="break-words whitespace-pre-wrap px-2 py-1" style={{ color:layer.color||'#fff',background:layer.background||'transparent',textAlign:layer.align||'center',fontFamily:layer.font==='serif'?'Georgia,serif':layer.font==='mono'?'monospace':'inherit',fontWeight:layer.bold?'bold':'normal',fontStyle:layer.italic?'italic':'normal',fontSize:`${clamp(Number(layer.size)||1,.3,3)*19}px`,textShadow:'0 2px 7px #000b',borderRadius:'0.4rem' }}>{layer.text}</div>;
    case 'emoji': return <span style={{fontSize:'44px',lineHeight:1}}>{layer.emoji}</span>;
    case 'image': return <img src={layer.previewUrl || mediaFile(layer.mediaId)} alt="Story image sticker" loading="lazy" className="max-h-36 w-36 rounded-lg object-contain"/>;
    case 'location': return <a className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-bold text-indigo-900 shadow" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(layer.label)}`} onClick={e=>isEditing&&e.preventDefault()}>📍 {layer.label}</a>;
    case 'gif': return <img src={layer.url} alt="Animated GIF sticker" loading="lazy" className="max-h-36 w-36 rounded-lg object-contain"/>;
    case 'mention': return <Link className="rounded-lg bg-white/90 px-3 py-1.5 font-bold text-indigo-900 shadow" to={`/u/${layer.username}`} onClick={e=>isEditing&&e.preventDefault()}>@{layer.username}</Link>;
    case 'poll': return <section className="w-56 rounded-xl bg-white/95 p-3 text-slate-900 shadow-lg"><strong className="block text-center text-sm">{layer.question}</strong><div className="mt-2 space-y-1">{layer.options.map((option,i)=><button type="button" key={i} disabled={isEditing||!!hasResponse} onClick={()=>onInteract?.(layer,{type:'poll',option:i})} className="flex w-full justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-left text-xs disabled:opacity-80"><span>{option}</span>{response?.votes && <span>{response.votes[i]||0}</span>}</button>)}</div></section>;
    case 'question': return <form className="w-56 rounded-xl bg-white/95 p-3 text-slate-900" onSubmit={e=>{e.preventDefault();if(answer.trim())onInteract?.(layer,{type:'question',answer:answer.trim()});}}><strong className="block text-center text-sm">{layer.question}</strong>{isEditing ? <p className="text-center text-xs">Answer box</p> : <div className="mt-2 flex gap-1"><input value={answer} onChange={e=>setAnswer(e.target.value)} maxLength={500} disabled={!!hasResponse} aria-label="Answer story question" placeholder="Type an answer" className="min-w-0 flex-1 rounded border p-1 text-xs"/><button type="submit" disabled={!!hasResponse} className="text-xs font-bold text-indigo-700">Send</button></div>}</form>;
    case 'slider': return <section className="w-56 rounded-xl bg-white/95 p-3 text-center text-slate-900"><strong className="block text-sm">{layer.question}</strong><div className="my-1 text-2xl">{layer.emoji}</div><input aria-label="Story reaction intensity" type="range" min="0" max="100" defaultValue="50" disabled={isEditing||!!hasResponse} onPointerUp={e=>onInteract?.(layer,{type:'slider',value:Number(e.currentTarget.value)})} onKeyUp={e=>e.key==='Enter'&&onInteract?.(layer,{type:'slider',value:Number(e.currentTarget.value)})} className="w-full accent-indigo-600"/>{response?.count>0&&<p className="text-xs">Average {Math.round(response.average)}%</p>}</section>;
    case 'countdown': return <div className="w-48 rounded-xl bg-black/65 p-3 text-center"><p className="text-sm font-bold">{layer.label}</p><Countdown date={layer.endsAt}/>{!isEditing&&<button type="button" onClick={()=>onInteract?.(layer,{type:'countdown',remind:!hasResponse?.remind})} className="mt-1 text-xs underline">{hasResponse?.remind?'Remove reminder':'Remind me'}</button>}</div>;
    case 'link': return <a className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow" href={layer.url} target="_blank" rel="noopener noreferrer" onClick={e=>isEditing&&e.preventDefault()}><ExternalLink size={14}/>{layer.label}</a>;
    case 'add_yours': return <button type="button" disabled={isEditing} onClick={()=>onInteract?.(layer,{type:'add_yours'})} className="rounded-xl bg-white/95 px-4 py-3 text-center text-indigo-900 shadow-lg"><span className="block text-xs font-bold">ADD YOURS</span><span className="text-sm">{layer.prompt}</span></button>;
    default: return null;
  }
}

/** Same normalized coordinates are used in the editor and published viewer. */
export default function StoryCanvas({ slide, mediaUrl, videoRef, onVideoTime, onVideoEnd, onInteract, results = [], editing = false, selectedLayerId, onSelectLayer, onMoveLayer, onMoveMusic, onResizeLayer, muted=false }) {
  const [moving,setMoving]=useState(null);
  const touch=useRef({points:new Map(),start:0,size:1});
  const frameRef=useRef(null);
  const effects=slide.effects||{};
  const cssFilter=`brightness(${effects.brightness??1}) contrast(${effects.contrast??1}) saturate(${effects.saturation??1})`;
  const src=mediaUrl || (slide.mediaId ? mediaFile(slide.mediaId) : null);
  const mediaStyle={ objectFit:effects.fit||'contain', objectPosition:`${effects.positionX??50}% ${effects.positionY??50}%`, filter:cssFilter,transform:`scale(${effects.zoom??1}) rotate(${effects.rotate??0}deg)` };
  const pointerMove=(event)=>{
    if(!moving||!frameRef.current)return;
    if(touch.current.points.has(event.pointerId)) touch.current.points.set(event.pointerId,[event.clientX,event.clientY]);
    if(touch.current.points.size>=2 && moving!=='__music'){const [a,b]=[...touch.current.points.values()];const dist=Math.hypot(a[0]-b[0],a[1]-b[1]);if(touch.current.start>0){onResizeLayer?.(moving,clamp(touch.current.size*dist/touch.current.start,.3,3));}return;}
    const bounds=frameRef.current.getBoundingClientRect();
    const relocate=moving==='__music'?onMoveMusic:onMoveLayer;
    if(moving==='__music'){relocate?.({x:Math.round(clamp((event.clientX-bounds.left)/bounds.width*100,4,96)),y:Math.round(clamp((event.clientY-bounds.top)/bounds.height*100,5,95))});return;}
    relocate?.(moving,{x:Math.round(clamp((event.clientX-bounds.left)/bounds.width*100,4,96)),y:Math.round(clamp((event.clientY-bounds.top)/bounds.height*100,5,95))});
  };
  return <div ref={frameRef} className="relative aspect-[9/16] h-full max-h-full w-full max-w-full select-none overflow-hidden rounded-xl bg-black shadow-2xl" style={{background:effects.background||'#17172b',touchAction:editing?'none':'auto'}} onPointerMove={pointerMove} onPointerUp={e=>{touch.current.points.delete(e.pointerId);if(!touch.current.points.size)setMoving(null);}} onPointerCancel={e=>{touch.current.points.delete(e.pointerId);if(!touch.current.points.size)setMoving(null);}}>
    {src && effects.blurBackground && slide.mediaKind!=='video' && <img src={src} aria-hidden="true" alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl"/>}
    {src && slide.mediaKind==='video' ? <video key={src} ref={videoRef} src={src} poster={slide.mediaId ? mediaFile(slide.mediaId,true) : undefined} playsInline preload="metadata" muted={muted} autoPlay={!editing} onTimeUpdate={onVideoTime} onEnded={onVideoEnd} style={mediaStyle} className="absolute inset-0 h-full w-full"/> : src ? <img src={src} alt="Story background" draggable={false} style={mediaStyle} className="absolute inset-0 h-full w-full"/> : <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-black/25"/>}
    {slide.layers?.map((layer)=>layer.type==='drawing' ? <svg key={layer.id} viewBox="0 0 100 177.7778" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none"><path d={layer.path} stroke={layer.color||'#fff'} strokeWidth={layer.strokeWidth||1} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg> : <div key={layer.id} onPointerDown={event=>{if(!editing)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);setMoving(layer.id);onSelectLayer?.(layer.id);touch.current.points.set(event.pointerId,[event.clientX,event.clientY]);if(touch.current.points.size===2){const [a,b]=[...touch.current.points.values()];touch.current.start=Math.hypot(a[0]-b[0],a[1]-b[1]);touch.current.size=layer.size||1;}}} onClick={()=>editing&&onSelectLayer?.(layer.id)} className={`${editing?'cursor-move touch-none':'pointer-events-auto'} absolute z-10 max-w-[90%] ${selectedLayerId===layer.id&&editing?'outline outline-2 outline-dashed outline-yellow-300':''}`} style={{left:`${layer.x??50}%`,top:`${layer.y??50}%`,transform:`translate(-50%,-50%) rotate(${layer.rotation||0}deg) scale(${layer.type==='text'?1:(layer.size||1)})`}}>
      <InteractiveLayer layer={layer} onInteract={onInteract} response={results.find(r=>r.stickerId===layer.id)} isEditing={editing}/>
    </div>)}
    {slide.music?.track && slide.music.style!=='hidden' && <div onPointerDown={event=>{if(!editing)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);setMoving('__music');onSelectLayer?.('__music');}} className={`${editing?'cursor-move':'pointer-events-none'} absolute z-20 flex max-w-[72%] items-center gap-2 rounded-lg bg-black/55 px-2 py-1 text-xs text-white`} style={{left:`${slide.music.x??50}%`,top:`${slide.music.y??82}%`,transform:`translate(-50%,-50%) scale(${slide.music.size||1})`}}>
      {slide.music.style==='cover' && slide.music.track.coverId ? <img src={mediaFile(slide.music.track.coverId)} alt="Album cover" className="size-8 rounded object-cover"/> : <Music2 size={15} className={slide.music.style==='animated'?'animate-pulse':''}/>}
      {!['minimal','animated'].includes(slide.music.style)&&<span className="min-w-0 truncate">{slide.music.track.title} · {slide.music.track.artist}</span>}
    </div>}
  </div>;
}
