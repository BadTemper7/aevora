import { useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, Film, ImagePlus, LoaderCircle, Music2, Paintbrush, Pause, Play, Plus, Redo2, Trash2, Type, Undo2, X } from 'lucide-react';
import { browseGiphy } from '../../messaging/giphyClient';
import { create, errorText, uploadMedia, waitForMedia, mediaFile } from '../../api/socialApi';
import StoryCanvas from './StoryCanvas';
import StoryMusicPicker from './StoryMusicPicker';

const uid=()=>Math.random().toString(36).slice(2,11);
const defaultEffects=()=>({background:'#17172b',fit:'contain',blurBackground:false,zoom:1,positionX:50,positionY:50,rotate:0,brightness:1,contrast:1,saturation:1,trimStart:0,trimEnd:0});
const newSlide=(file=null)=>({id:uid(),file,previewUrl:null,mediaId:null,mediaKind:file?(file.type.startsWith('video/')?'video':file.type==='image/gif'?'gif':'image'):'text',duration:10,visibility:'public',effects:defaultEffects(),layers:[],music:null,sourceDuration:0});
const defaultLayer=(type)=>{
  const base={id:uid(),type,x:50,y:50,rotation:0,size:1};
  switch(type){
    case 'text':return {...base,text:'Your text',color:'#ffffff',font:'sans',align:'center',bold:true,italic:false};
    case 'location':return {...base,label:'Select a location'};
    case 'image':return {...base,mediaId:'',file:null};
    case 'emoji':return {...base,emoji:'💜'};
    case 'mention':return {...base,username:'username'};
    case 'poll':return {...base,question:'Your question?',options:['Yes','No']};
    case 'question':return {...base,question:'Ask me anything!'};
    case 'slider':return {...base,question:'How much do you love this?',emoji:'❤️'};
    case 'countdown':return {...base,label:'Countdown',endsAt:new Date(Date.now()+3600_000).toISOString()};
    case 'link':return {...base,url:'https://example.com',label:'Visit link'};
    case 'add_yours':return {...base,prompt:'Show us yours'};
    case 'drawing':return {...base,path:'M 50 89 L 51 90',color:'#ffffff',strokeWidth:1};
    default:return base;
  }
};
const permittedFile=(file)=>['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','video/webm','video/quicktime'].includes(file?.type);
const toLocalInput=(date)=>{const d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const editorButton='rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-40';
function useDraftUrls(slides){
  const refs=useRef(new Map());
  useEffect(()=>()=>{for(const url of refs.current.values()) URL.revokeObjectURL(url);refs.current.clear();},[]);
  for (const item of slides) if(item.file&&!refs.current.has(item.id)) refs.current.set(item.id,URL.createObjectURL(item.file));
  return refs.current;
}

export default function StoryEditor({ initialFile, initialFiles, onClose, onPublished, promptSource=null }) {
  const stickerUrls=useRef(new Set());
  useEffect(()=>()=>{for(const url of stickerUrls.current)URL.revokeObjectURL(url);},[]);
  const [slides,setSlides]=useState(()=>(initialFiles?.length ? initialFiles.map(newSlide) : [newSlide(initialFile)]));
  const [active,setActive]=useState(0);
  const [selectedId,setSelectedId]=useState(null);
  const [tab,setTab]=useState('edit');
  const [viewing,setViewing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState('');
  const [error,setError]=useState('');
  const [musicOpen,setMusicOpen]=useState(false);
  const [cameraOpen,setCameraOpen]=useState(false);
  const [recording,setRecording]=useState(false);
  const [drawMode,setDrawMode]=useState(false);
  const [gifOpen,setGifOpen]=useState(false);
  const [gifTerm,setGifTerm]=useState('');
  const [gifs,setGifs]=useState([]);
  const [gifBusy,setGifBusy]=useState(false);
  const [history,setHistory]=useState([]);
  const [future,setFuture]=useState([]);
  const [playing,setPlaying]=useState(false);
  const [drawPath,setDrawPath]=useState('');
  const [drawColor,setDrawColor]=useState('#ffffff');
  const [drawWidth,setDrawWidth]=useState(1.5);
  const stickerFileRef=useRef(null);
  const fileRef=useRef(null);const cameraRef=useRef(null);const streamRef=useRef(null);const abortRef=useRef(null);const recorderRef=useRef(null);const recordParts=useRef([]);const videoRef=useRef(null);const audioRef=useRef(null);const previewTimer=useRef(null);
  const urls=useDraftUrls(slides);
  const slide=slides[active]||slides[0];
  const selected=slide.layers.find(l=>l.id===selectedId);
  const maxVideoDuration=60;
  // Record draft changes in event handlers, not inside a React state updater.
  // React StrictMode may invoke updater functions more than once.
  const slidesRef=useRef(slides);
  slidesRef.current=slides;
  const commitSlides=(next,record=true)=>{
    const previous=slidesRef.current;
    if(record){setHistory(p=>[...p.slice(-25),previous]);setFuture([]);}
    slidesRef.current=next;
    setSlides(next);
  };
  const change=(updater,record=true)=>{
    const previous=slidesRef.current;
    const next=previous.slice();
    next[active]=typeof updater==='function'?updater(previous[active]):{...previous[active],...updater};
    commitSlides(next,record);
  };
  const update=(patch,record=true)=>change(old=>({...old,...patch}),record);
  const mutateLayer=(id,patch,record=true)=>change(old=>({...old,layers:old.layers.map(l=>l.id===id?{...l,...patch}:l)}),record);
  const undo=()=>{
    if(!history.length)return;
    const previous=history.at(-1);
    setFuture(p=>[slidesRef.current,...p]);
    slidesRef.current=previous;setSlides(previous);
    setHistory(p=>p.slice(0,-1));setSelectedId(null);
    setActive(i=>Math.min(i,previous.length-1));
  };
  const redo=()=>{
    if(!future.length)return;
    const next=future[0];
    setHistory(p=>[...p,slidesRef.current]);
    slidesRef.current=next;setSlides(next);
    setFuture(p=>p.slice(1));setSelectedId(null);
    setActive(i=>Math.min(i,next.length-1));
  };
  const addFiles=(files)=>{
    const incoming=[...files].filter(Boolean);
    if(incoming.some(f=>!permittedFile(f))){setError('Supported formats: JPG, PNG, WebP, GIF, AVIF, MP4, MOV and WebM.');return;}
    const current=slidesRef.current;
    const replace=current.length===1&&current[0].mediaKind==='text'&&current[0].layers.length===0&&!current[0].music;
    if((replace?incoming.length:current.length+incoming.length)>10){setError('A story can contain up to 10 slides.');return;}
    if(!incoming.length)return;
    const next=replace?incoming.map(newSlide):[...current,...incoming.map(newSlide)];
    commitSlides(next);
    setActive(replace?0:current.length);
    setSelectedId(null);setError('');
  };
  const addSlide=()=>{
    const current=slidesRef.current;
    if(current.length>=10){setError('10-slide limit reached.');return;}
    commitSlides([...current,newSlide()]);
    setActive(current.length);setSelectedId(null);
  };
  const removeSlide=()=>{
    const current=slidesRef.current;
    if(current.length===1){update({...newSlide(),id:slide.id});setSelectedId(null);return;}
    commitSlides(current.filter((_,i)=>i!==active));
    setActive(Math.max(0,active-1));setSelectedId(null);
  };
  const appendImageSticker=(file)=>{if(!file?.type.startsWith('image/')){setError('Select a photo or transparent PNG.');return;}const previewUrl=URL.createObjectURL(file);stickerUrls.current.add(previewUrl);const layer={...defaultLayer('image'),file,previewUrl};change(old=>({...old,layers:[...old.layers,layer]}));setSelectedId(layer.id);};
  const appendLayer=(type)=>{const layer=defaultLayer(type);change(old=>({...old,layers:[...old.layers,layer]}));setSelectedId(layer.id);setTab('edit');};
  const getMetadata=(el)=>{const duration=Number(el.duration||0);if(duration>0&&slide.mediaKind==='video')update({sourceDuration:duration,duration:Math.min(15,Math.ceil(duration)),effects:{...slide.effects,trimEnd:Math.min(duration,60)}},false);};
  const addGif=async()=>{setGifBusy(true);try{const data=await browseGiphy({term:gifTerm});setGifs(data.items);}catch(e){setError(errorText(e));}finally{setGifBusy(false);}};
  const toggleCamera=async()=>{setError('');try{const media=await navigator.mediaDevices.getUserMedia({video:true,audio:false});streamRef.current=media;setCameraOpen(true);}catch(e){setError(`Camera unavailable: ${e.message}`);}};
  useEffect(()=>{if(cameraOpen&&cameraRef.current&&streamRef.current){cameraRef.current.srcObject=streamRef.current;cameraRef.current.play().catch(()=>{});}},[cameraOpen]);
  const closeCamera=()=>{recorderRef.current?.state==='recording'&&recorderRef.current.stop();streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCameraOpen(false);setRecording(false);};
  const capturePhoto=async()=>{const video=cameraRef.current;if(!video?.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);canvas.toBlob(blob=>{if(blob)addFiles([new File([blob],`story-${Date.now()}.jpg`,{type:'image/jpeg'})]);closeCamera();},'image/jpeg',.9);};
  const toggleRecording=async()=>{
    if(recording){recorderRef.current?.stop();setRecording(false);return;}
    try{const mic=await navigator.mediaDevices.getUserMedia({audio:true});const recordingStream=new MediaStream([...streamRef.current.getVideoTracks(),...mic.getAudioTracks()]);streamRef.current.addTrack(mic.getAudioTracks()[0]);const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));const recorder=new MediaRecorder(recordingStream,mime?{mimeType:mime}:{});recordParts.current=[];recorder.ondataavailable=e=>e.data.size&&recordParts.current.push(e.data);recorder.onstop=()=>{const blob=new Blob(recordParts.current,{type:recorder.mimeType||'video/webm'});if(blob.size)addFiles([new File([blob],`story-${Date.now()}.webm`,{type:'video/webm'})]);closeCamera();};recorder.start(1000);recorderRef.current=recorder;setRecording(true);setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},60000);}catch(e){setError(errorText(e));}
  };
  useEffect(()=>()=>{streamRef.current?.getTracks().forEach(track=>track.stop());clearInterval(previewTimer.current);audioRef.current?.pause();},[]);
  const startPreview=()=>{
    if(playing){setPlaying(false);clearInterval(previewTimer.current);videoRef.current?.pause();audioRef.current?.pause();return;}
    setPlaying(true);
    if(slide.mediaKind==='video'&&videoRef.current){videoRef.current.currentTime=slide.effects.trimStart||0;videoRef.current.volume=slide.music?.originalVolume??1;videoRef.current.play().catch(()=>{});}
    if(slide.music&&audioRef.current){audioRef.current.currentTime=slide.music.start||0;audioRef.current.volume=slide.music.volume??.7;audioRef.current.play().catch(()=>{});}
    let elapsed=0;clearInterval(previewTimer.current);previewTimer.current=setInterval(()=>{elapsed+=.1;if(elapsed>=slide.duration){clearInterval(previewTimer.current);setPlaying(false);audioRef.current?.pause();videoRef.current?.pause();}},100);
  };
  const publish=async()=>{
    if(busy)return;
    const controller=new AbortController();abortRef.current=controller;
    setBusy(true);setError('');setPlaying(false);audioRef.current?.pause();clearInterval(previewTimer.current);
    try{
      const payload=[];
      for(let i=0;i<slides.length;i++){
        const current=slides[i];let mediaId=current.mediaId;
        const layers=[];
        for(const layer of current.layers){if(layer.type==='image'&&layer.file){setProgress(`Slide ${i+1}: optimizing custom sticker...`);const asset=await uploadMedia(layer.file,'story');await waitForMedia(asset.id,undefined,controller.signal);const {file,previewUrl,...ready}=layer;layers.push({...ready,mediaId:asset.id});}else{const {file,previewUrl,...ready}=layer;layers.push(ready);}}
        if(current.file){
          setProgress(`Slide ${i+1}/${slides.length}: optimizing and uploading...`);
          const trimStart=current.mediaKind==='video'?Number(current.effects.trimStart||0):0;
          const trimEnd=current.mediaKind==='video'?Number(current.effects.trimEnd||0):0;
          const uploaded=await uploadMedia(current.file,'story',p=>setProgress(`Slide ${i+1}: uploading ${p}%`),controller.signal,stage=>setProgress(`Slide ${i+1}: ${stage}`),{trimStart,trimEnd});
          mediaId=uploaded.id;
          await waitForMedia(mediaId,item=>setProgress(`Slide ${i+1}: processing ${item.progress||0}%`),controller.signal);
        }
        payload.push({mediaId:mediaId||null,mediaKind:current.mediaKind,duration:current.duration,visibility:current.visibility,
          effects:{...current.effects,...(current.mediaKind==='video'?{trimStart:0,trimEnd:current.duration}: {})},layers,
          music:current.music?{trackId:current.music.trackId,start:current.music.start,volume:current.music.volume,originalVolume:current.music.originalVolume??1,style:current.music.style,fadeIn:current.music.fadeIn||0,fadeOut:current.music.fadeOut||0,x:current.music.x,y:current.music.y,size:current.music.size||1}:null});
      }
      setProgress('Publishing all story slides...');
      await create('/stories/batch',{slides:payload,...(promptSource?{promptSource:{storyId:promptSource.storyId,stickerId:promptSource.stickerId}}:{})});
      onPublished?.();onClose?.();
    }catch(e){setError(errorText(e));}finally{setBusy(false);abortRef.current=null;setProgress('');}
  };
  const putLayer=(key,val)=>selected&&mutateLayer(selected.id,{[key]:val});
  const tabs=['edit','stickers','adjust'];
  const isVideo=slide.mediaKind==='video';
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Create AEVORA story" className="fixed inset-0 z-[100] flex flex-col bg-[#0b0b15] text-white">
    <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-6"><button type="button" onClick={onClose} disabled={busy} className="flex items-center gap-2 text-sm"><ArrowLeft size={19}/> Back</button><h2 className="font-bold">{promptSource?.prompt?`Add yours: ${promptSource.prompt}`:'Create story'} <span className="text-xs font-normal text-white/60">{active+1} / {slides.length}</span></h2><div className="flex gap-1"><button type="button" aria-label="Undo" disabled={!history.length||busy} onClick={undo} className={editorButton}><Undo2 size={16}/></button><button type="button" aria-label="Redo" disabled={!future.length||busy} onClick={redo} className={editorButton}><Redo2 size={16}/></button></div></header>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black/30 p-2 sm:p-4" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files?.length)addFiles(e.dataTransfer.files);}}>
        <div className="relative h-full max-h-[min(68dvh,750px)] w-full max-w-[420px]" style={{aspectRatio:'9/16'}}>
          <StoryCanvas slide={slide} mediaUrl={slide.file?urls.get(slide.id):slide.mediaId?mediaFile(slide.mediaId):null} videoRef={videoRef} editing={!viewing} selectedLayerId={selectedId} onSelectLayer={setSelectedId} onMoveLayer={(id,pos)=>mutateLayer(id,pos,false)} onResizeLayer={(id,size)=>mutateLayer(id,{size},false)} onMoveMusic={pos=>update({music:{...slide.music,...pos}},false)} muted={!playing}/>
          {slide.file&&isVideo&&<video className="hidden" src={urls.get(slide.id)} preload="metadata" onLoadedMetadata={e=>getMetadata(e.currentTarget)}/>}
          {drawMode&&!viewing&&<svg viewBox="0 0 100 177.78" preserveAspectRatio="none" className="absolute inset-0 z-30 size-full touch-none" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();setDrawPath(`M ${((e.clientX-r.left)/r.width*100).toFixed(1)} ${((e.clientY-r.top)/r.height*177.78).toFixed(1)}`);}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect();setDrawPath(v=>`${v} L ${((e.clientX-r.left)/r.width*100).toFixed(1)} ${((e.clientY-r.top)/r.height*177.78).toFixed(1)}`.slice(0,4000));}} onPointerUp={()=>{if(drawPath.length>12){const layer={...defaultLayer('drawing'),path:drawPath,color:drawColor,strokeWidth:drawWidth};change(v=>({...v,layers:[...v.layers,layer]}));}setDrawPath('');}}><path d={drawPath} stroke={drawColor} strokeWidth={drawWidth} strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
          {slide.music?.track && <audio ref={audioRef} src={mediaFile(slide.music.track.mediaId)} preload="metadata"/>}
        </div>
      </div>
      <aside className="flex max-h-[40dvh] min-h-0 w-full flex-col border-t border-white/10 bg-[#181825] lg:max-h-none lg:w-[350px] lg:border-l lg:border-t-0">
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-3">
          <button onClick={()=>fileRef.current?.click()} className={editorButton} type="button"><ImagePlus size={15} className="inline"/> Media</button>
          <button onClick={toggleCamera} className={editorButton} type="button"><Camera size={15} className="inline"/> Camera</button>
          <button onClick={()=>setMusicOpen(true)} className={editorButton} type="button"><Music2 size={15} className="inline"/> Music</button>
          <button onClick={()=>{setDrawMode(!drawMode);setViewing(false);}} className={editorButton} type="button"><Paintbrush size={15} className="inline"/> {drawMode?'Stop drawing':'Draw'}</button>
          <button onClick={startPreview} type="button" className={editorButton}>{playing?<Pause size={16} className="inline"/>:<Play size={16} className="inline"/>} {playing?'Pause':'Preview'}</button>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={e=>{addFiles(e.target.files||[]);e.target.value='';}}/>
        <nav className="flex border-b border-white/10">{tabs.map(t=><button type="button" key={t} onClick={()=>setTab(t)} className={`flex-1 px-3 py-2 text-sm capitalize ${tab===t?'border-b-2 border-indigo-500 text-white':'text-white/60'}`}>{t}</button>)}</nav>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
          {tab==='stickers' && <><p className="text-xs text-white/60">Add interactive stickers. Tap a sticker on the canvas to edit or drag it.</p><div className="grid grid-cols-3 gap-2">{[['text','Text'],['emoji','Emoji'],['location','Location'],['mention','Mention'],['poll','Poll'],['question','Question'],['slider','Emoji slider'],['countdown','Countdown'],['link','Link'],['add_yours','Add Yours']].map(([type,label])=><button type="button" key={type} className={editorButton} onClick={()=>appendLayer(type)}>{label}</button>)}<button type="button" className={editorButton} onClick={()=>{setGifOpen(true);addGif();}}>GIF</button><button type="button" className={editorButton} onClick={()=>stickerFileRef.current?.click()}>Image sticker</button><input ref={stickerFileRef} className="sr-only" type="file" accept="image/png,image/webp,image/jpeg,image/gif" onChange={e=>{appendImageSticker(e.target.files?.[0]);e.target.value='';}}/></div></>}
          {tab==='adjust'&&<><label className="block">Background <input type="color" value={slide.effects.background} onChange={e=>update({effects:{...slide.effects,background:e.target.value}})} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={slide.effects.blurBackground} onChange={e=>update({effects:{...slide.effects,blurBackground:e.target.checked}})}/>Blur background behind fitted photos</label><label className="block">Image fit<select className="ml-2 rounded bg-slate-800 p-1" value={slide.effects.fit} onChange={e=>update({effects:{...slide.effects,fit:e.target.value}})}><option value="contain">Fit</option><option value="cover">Fill</option></select></label>{[['zoom',1,3,.05],['rotate',-180,180,5],['brightness',.3,2,.05],['contrast',.3,2,.05],['saturation',0,3,.05],['positionX',0,100,1],['positionY',0,100,1]].map(([key,min,max,step])=><label className="block capitalize" key={key}>{key} {slide.effects[key]}<input type="range" className="block w-full accent-indigo-500" min={min} max={max} step={step} value={slide.effects[key]} onChange={e=>update({effects:{...slide.effects,[key]:Number(e.target.value)}},false)}/></label>)}</>}
          {tab==='edit'&&<><label className="block">Audience<select value={slide.visibility} className="mt-1 block w-full rounded-lg bg-slate-800 p-2" onChange={e=>update({visibility:e.target.value})}><option value="public">Everyone</option><option value="friends">Friends</option><option value="followers">Followers</option></select></label><label className="block">Story duration: {slide.duration}s<select value={slide.duration} className="ml-3 rounded-lg bg-slate-800 p-1" onChange={e=>update({duration:Number(e.target.value),music:slide.music&&Number(e.target.value)+slide.music.start<=slide.music.track.duration?slide.music:null})}>{(isVideo?[5,10,15,30,60].filter(d=>!slide.sourceDuration||d<=slide.sourceDuration):[5,10,15]).map(d=><option key={d} value={d}>{d} seconds</option>)}</select></label>
            {isVideo&&<><p className="text-xs">Video clip selection</p><label className="block text-xs">Start: {slide.effects.trimStart.toFixed(1)}s<input type="range" className="block w-full" min={0} max={Math.max(0,(slide.sourceDuration||60)-3)} step=".5" value={slide.effects.trimStart} onChange={e=>{const start=Number(e.target.value);const end=Math.min(slide.sourceDuration||60,Math.max(start+3,start+Math.min(60,slide.duration)));update({effects:{...slide.effects,trimStart:start,trimEnd:end},duration:Math.min(slide.duration,end-start)},false);}}/></label><label className="block text-xs">End: {slide.effects.trimEnd.toFixed(1)}s<input type="range" className="block w-full" min={Math.min(slide.sourceDuration||60,slide.effects.trimStart+3)} max={slide.sourceDuration||60} step=".5" value={slide.effects.trimEnd||Math.min(slide.sourceDuration||60,15)} onChange={e=>{const end=Number(e.target.value);update({effects:{...slide.effects,trimEnd:end},duration:Math.min(slide.duration,end-slide.effects.trimStart)},false);}}/></label></>}
            {slide.music&&<><div className="rounded-xl bg-slate-800 p-3"><p className="font-semibold">♪ {slide.music.track.title}</p><p className="text-xs">{slide.music.start.toFixed(1)}s – {(slide.music.start+slide.duration).toFixed(1)}s</p><label className="block text-xs">Music start<input className="w-full" type="range" min="0" max={Math.max(0,slide.music.track.duration-slide.duration)} step="0.5" value={slide.music.start} onChange={e=>update({music:{...slide.music,start:Number(e.target.value)}},false)}/></label>{isVideo&&<label className="block text-xs">Original audio {Math.round((slide.music.originalVolume??1)*100)}%<input type="range" min="0" max="1" step=".1" className="w-full" value={slide.music.originalVolume??1} onChange={e=>update({music:{...slide.music,originalVolume:Number(e.target.value)}},false)}/></label>}<button onClick={()=>update({music:null})} type="button" className="text-xs underline">Remove music</button></div></>}
          </>}
          {selectedId==='__music'&&slide.music&&<div className="rounded-xl bg-indigo-900/20 p-3 text-xs">Music sticker size<input type="range" min=".5" max="2" step=".1" className="block w-full" value={slide.music.size||1} onChange={e=>update({music:{...slide.music,size:Number(e.target.value)}},false)}/></div>}
          {selected&&<div className="space-y-2 rounded-xl border border-indigo-400/40 bg-indigo-900/20 p-3"><div className="flex justify-between"><strong className="capitalize">Edit {selected.type}</strong><button aria-label="Remove selected sticker" onClick={()=>{change(v=>({...v,layers:v.layers.filter(l=>l.id!==selected.id)}));setSelectedId(null);}}><Trash2 size={16}/></button></div>
            {['text','question','slider','poll','mention','link','countdown','add_yours','location'].includes(selected.type)&&<label className="block text-xs">{selected.type==='text'?'Text':selected.type==='mention'?'Username':selected.type==='link'||selected.type==='location'?'Label':selected.type==='countdown'?'Countdown label':selected.type==='add_yours'?'Story prompt':'Question'}<input className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 p-2" value={selected.text??selected.username??selected.label??selected.prompt??selected.question??''} onChange={e=>putLayer(selected.type==='text'?'text':selected.type==='mention'?'username':selected.type==='countdown'||selected.type==='link'||selected.type==='location'?'label':selected.type==='add_yours'?'prompt':'question',e.target.value)}/></label>}
            {selected.type==='poll'&&<label className="block text-xs">Answers (2–4, one per line)<textarea rows="3" className="mt-1 w-full rounded-lg bg-black/30 p-2" value={selected.options.join('\n')} onChange={e=>putLayer('options',e.target.value.split('\n').slice(0,4))}/></label>}
            {selected.type==='emoji'||selected.type==='slider'?<label className="block text-xs">Emoji<input className="mt-1 w-full rounded bg-black/30 p-2" value={selected.emoji} onChange={e=>putLayer('emoji',e.target.value)}/></label>:null}
            {selected.type==='link'&&<label className="block text-xs">HTTPS URL<input className="mt-1 w-full rounded bg-black/30 p-2" value={selected.url} onChange={e=>putLayer('url',e.target.value)}/></label>}
            {selected.type==='countdown'&&<label className="block text-xs">Ends at<input type="datetime-local" className="mt-1 w-full rounded bg-black/30 p-2" value={selected.endsAt?toLocalInput(selected.endsAt):''} onChange={e=>putLayer('endsAt',new Date(e.target.value).toISOString())}/></label>}
            {['text','drawing'].includes(selected.type)&&<label className="block text-xs">Color<input type="color" value={selected.color||'#ffffff'} onChange={e=>putLayer('color',e.target.value)}/></label>}
            {selected.type==='text'&&<div className="flex flex-wrap items-center gap-2"><label className="text-xs">Highlight<input type="color" value={selected.background||'#000000'} onChange={e=>putLayer('background',e.target.value)}/></label><button type="button" className={editorButton} onClick={()=>putLayer('background',undefined)}>No highlight</button><label>Align<select className="ml-1 rounded bg-black/30 p-1" value={selected.align} onChange={e=>putLayer('align',e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label>Font<select className="ml-1 rounded bg-black/30 p-1" value={selected.font} onChange={e=>putLayer('font',e.target.value)}><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select></label><button type="button" className={editorButton} onClick={()=>putLayer('bold',!selected.bold)}>Bold</button><button type="button" className={editorButton} onClick={()=>putLayer('italic',!selected.italic)}>Italic</button></div>}
            <label className="block text-xs">Sticker size {selected.size}<input type="range" className="block w-full" min=".3" max="3" step=".1" value={selected.size} onChange={e=>putLayer('size',Number(e.target.value))}/></label><label className="block text-xs">Rotation {selected.rotation}°<input type="range" className="block w-full" min="-180" max="180" step="5" value={selected.rotation} onChange={e=>putLayer('rotation',Number(e.target.value))}/></label>
          </div>}
          {drawMode&&<div className="space-y-2"><label className="block text-xs">Brush color <input type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)}/></label><label className="block text-xs">Brush width ({drawWidth.toFixed(1)})<input type="range" className="block w-full" min="0.5" max="8" step="0.5" value={drawWidth} onChange={e=>setDrawWidth(Number(e.target.value))}/></label></div>}
        </div>
      </aside>
    </div>
    <footer className="border-t border-white/10 bg-[#141420] px-3 py-2 sm:px-6"><div className="mb-2 flex items-center gap-2 overflow-x-auto">{slides.map((s,i)=><button type="button" key={s.id} onClick={()=>{setActive(i);setSelectedId(null);setPlaying(false);clearInterval(previewTimer.current);}} className={`flex size-12 shrink-0 items-center justify-center rounded-lg border text-xs ${i===active?'border-indigo-400 bg-indigo-600':'border-white/20 bg-white/10'}`}>{s.file&&urls.get(s.id)?<img src={urls.get(s.id)} alt={`Slide ${i+1}`}/>:s.mediaKind==='video'?<Film size={21}/>:s.mediaKind==='text'?<Type size={19}/>:<ImagePlus size={19}/>}</button>)}<button onClick={addSlide} aria-label="Add text slide" type="button" className={editorButton}><Plus size={17}/></button><button onClick={removeSlide} title="Remove slide" type="button" className={editorButton}><Trash2 size={17}/></button></div>
      {progress&&<div className="mb-1 flex items-center justify-between gap-2"><p className="text-xs text-indigo-200" role="status"><LoaderCircle size={13} className="mr-1 inline animate-spin"/>{progress}</p>{busy&&<button type="button" className="text-xs underline" onClick={()=>abortRef.current?.abort()}>Cancel upload</button>}</div>}{error&&<p role="alert" className="mb-1 text-xs text-red-300">{error}</p>}
      <button type="button" disabled={busy} onClick={publish} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?'Processing story...':`Share ${slides.length} slide${slides.length===1?'':'s'} for 24 hours`}</button>
    </footer>
    {musicOpen&&<StoryMusicPicker duration={slide.duration} selected={slide.music} onClose={()=>setMusicOpen(false)} onSelect={music=>{update({music});setMusicOpen(false);}}/>}
    {gifOpen&&<div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Find GIF stickers"><div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 text-slate-900"><div className="flex justify-between"><strong>GIF stickers</strong><button type="button" onClick={()=>setGifOpen(false)}><X size={17}/></button></div><div className="my-3 flex gap-2"><input className="min-w-0 flex-1 rounded border px-2" placeholder="Search animated stickers" value={gifTerm} onChange={e=>setGifTerm(e.target.value)}/><button className="rounded bg-indigo-600 px-3 text-white" onClick={addGif} disabled={gifBusy}>Search</button></div><div className="grid grid-cols-2 gap-2">{gifs.map(g=><button key={g.id} onClick={()=>{const layer={...defaultLayer('gif'),url:g.url};change(v=>({...v,layers:[...v.layers,layer]}));setSelectedId(layer.id);setGifOpen(false);}}><img alt={g.description||'GIF'} src={g.previewUrl} loading="lazy" className="aspect-square w-full object-contain"/></button>)}</div>{gifBusy&&<p>Loading GIFs...</p>}</div></div>}
    {cameraOpen&&<div className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-black p-4" role="dialog" aria-label="Capture story"><button type="button" onClick={closeCamera} className="self-end"><X/></button><video ref={cameraRef} playsInline muted className="max-h-[70vh] rounded-xl"/><div className="flex gap-3"><button type="button" onClick={capturePhoto} className={editorButton}>Take photo</button><button type="button" onClick={toggleRecording} className={editorButton}>{recording?'Stop recording':'Record video (60s max)'}</button></div></div>}
  </div>,document.body);
}
