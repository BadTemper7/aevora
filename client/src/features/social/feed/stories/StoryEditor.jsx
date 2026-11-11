import { useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, Film, ImagePlus, LoaderCircle, Music2, Paintbrush, Pause, Play, Plus, Redo2, Trash2, Type, Undo2, X } from 'lucide-react';
import { browseGiphy } from '../../messaging/giphyClient';
import { create, read, errorText, uploadMedia, waitForMedia, mediaFile } from '../../api/socialApi';
import StoryCanvas from './StoryCanvas';
import StoryMusicPicker from './StoryMusicPicker';
import StoryTimeline from './StoryTimeline';
import { durationTotal,availableTime,formatTime,canSetDuration,withDuration,moveClip,splitClip,duplicateClip,clipAtTime } from './storyTimeline';
import { saveDraft,loadDraft,clearDraft } from './storyDrafts';

const uid=()=>Math.random().toString(36).slice(2,11);
const defaultEffects=()=>({background:'#17172b',fit:'contain',blurBackground:false,zoom:1,positionX:50,positionY:50,rotate:0,brightness:1,contrast:1,saturation:1,trimStart:0,trimEnd:0});
const newSlide=(file=null)=>({id:uid(),file,previewUrl:null,mediaId:null,mediaKind:file?(file.type.startsWith('video/')?'video':file.type==='image/gif'?'gif':'image'):'text',duration:5,speed:1,transition:'cut',effectPreset:'none',overlayAnimation:'none',visibility:'public',effects:defaultEffects(),layers:[],music:null,sourceDuration:0});
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
  useEffect(()=>()=>{for(const item of refs.current.values()) URL.revokeObjectURL(item.url);refs.current.clear();},[]);
  for (const item of slides) {
    const old=refs.current.get(item.id);
    if(item.file&&(!old||old.file!==item.file)){if(old)URL.revokeObjectURL(old.url);refs.current.set(item.id,{file:item.file,url:URL.createObjectURL(item.file)});}
    if(!item.file&&old){URL.revokeObjectURL(old.url);refs.current.delete(item.id);}
  }
  for(const [id,old] of refs.current)if(!slides.some(x=>x.id===id)){URL.revokeObjectURL(old.url);refs.current.delete(id);}
  return { get:id=>refs.current.get(id)?.url };
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
  const [playhead,setPlayhead]=useState(0);
  const [outputMode,setOutputMode]=useState('mp4');
  const [draftSaved,setDraftSaved]=useState(false);
  const [draftPrompt,setDraftPrompt]=useState(null);
  const [draftChecked,setDraftChecked]=useState(false);
  const [renderStatus,setRenderStatus]=useState(null);
  const latestRequestId=useRef(null);
  const [drawPath,setDrawPath]=useState('');
  const [drawColor,setDrawColor]=useState('#ffffff');
  const [drawWidth,setDrawWidth]=useState(1.5);
  const stickerFileRef=useRef(null);
  const fileRef=useRef(null);const cameraRef=useRef(null);const streamRef=useRef(null);const abortRef=useRef(null);const recorderRef=useRef(null);const recordParts=useRef([]);const videoRef=useRef(null);const audioRef=useRef(null);const previewTimer=useRef(null);
  const urls=useDraftUrls(slides);
  const slide=slides[active]||slides[0];
  const selected=slide.layers.find(l=>l.id===selectedId);
  const totalDuration=durationTotal(slides);
  const remainingDuration=availableTime(slides);
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
  useEffect(()=>{let alive=true;
    if(initialFile||initialFiles?.length||promptSource){setDraftChecked(true);return;}
    loadDraft().then(draft=>{if(alive&&draft?.slides?.length)setDraftPrompt(draft);}).catch(()=>{}).finally(()=>alive&&setDraftChecked(true));
    return()=>{alive=false;};
  },[]);
  useEffect(()=>{if(!draftChecked||draftPrompt||busy)return;
    const timer=setTimeout(()=>saveDraft(slides).then(()=>setDraftSaved(true)).catch(()=>setDraftSaved(false)),900);
    return()=>clearTimeout(timer);
  },[slides,draftChecked,draftPrompt,busy]);
  const restoreDraft=()=>{const restored=draftPrompt?.slides?.map(x=>({...x,layers:x.layers.map(l=>({...l}))}));if(restored?.length){commitSlides(restored,false);setActive(0);setPlayhead(0);}setDraftPrompt(null);};
  const discardDraft=()=>{clearDraft().catch(()=>{});setDraftPrompt(null);};
  const addFiles=(files)=>{
    const incoming=[...files].filter(Boolean);
    if(incoming.some(f=>!permittedFile(f))){setError('Supported formats: JPG, PNG, WebP, GIF, AVIF, MP4, MOV and WebM.');return;}
    const current=slidesRef.current;
    const replace=current.length===1&&current[0].mediaKind==='text'&&current[0].layers.length===0&&!current[0].music;
    if((replace?incoming.length:current.length+incoming.length)>10){setError('A story can contain up to 10 slides.');return;}
    if(!incoming.length)return;
    const seconds=replace?60:availableTime(current);
    if(seconds<incoming.length*.5){setError('Story timeline is full (60 seconds maximum).');return;}
    const additions=incoming.map((f,i)=>({...newSlide(f),duration:Math.min(5,Math.floor(seconds/incoming.length*10)/10)}));
    const next=replace?additions:[...current,...additions];
    commitSlides(next);
    setActive(replace?0:current.length);
    setSelectedId(null);setError('');
  };
  const addSlide=()=>{
    const current=slidesRef.current;
    if(current.length>=10){setError('10-clip limit reached.');return;}
    if(availableTime(current)<.5){setError('60-second timeline limit reached.');return;}
    commitSlides([...current,{...newSlide(),duration:Math.min(5,availableTime(current))}]);
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
  const getMetadata=(el)=>{const duration=Number(el.duration||0);if(duration>0&&slide.mediaKind==='video'){
    const allowed=availableTime(slidesRef.current)+slide.duration;
    const next=Math.min(Math.max(.5,Math.floor(duration*10)/10),allowed,slide.duration);
    update({sourceDuration:duration,duration:next,effects:{...slide.effects,trimEnd:Math.min(duration,60)}},false);
  }};
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
  useEffect(()=>{
    if(!playing)return;
    const play=()=>{
      if(slide.mediaKind==='video'&&videoRef.current){videoRef.current.currentTime=Number(slide.effects?.trimStart||0)+Math.max(0,playhead-slides.slice(0,active).reduce((sum,c)=>sum+c.duration,0))*Number(slide.speed||1);videoRef.current.playbackRate=Number(slide.speed||1);videoRef.current.volume=slide.music?.originalVolume??1;videoRef.current.play().catch(()=>{});}
      if(slide.music&&audioRef.current){audioRef.current.currentTime=(slide.music.start||0)+Math.max(0,playhead-slides.slice(0,active).reduce((sum,c)=>sum+c.duration,0));audioRef.current.volume=slide.music.volume??.7;audioRef.current.play().catch(()=>{});}
    };
    const timer=setTimeout(play,60);return()=>clearTimeout(timer);
  },[active,playing]);
  const pausePreview=()=>{setPlaying(false);clearInterval(previewTimer.current);videoRef.current?.pause();audioRef.current?.pause();};
  const seekTo=(time)=>{
    pausePreview();const t=Math.max(0,Math.min(totalDuration-.001,time));setPlayhead(t);
    const found=clipAtTime(slidesRef.current,t);setActive(found.index);
    requestAnimationFrame(()=>{if(videoRef.current)try{videoRef.current.currentTime=(slidesRef.current[found.index]?.effects.trimStart||0)+found.local*(slidesRef.current[found.index]?.speed||1);}catch{}});
  };
  const startPreview=()=>{
    if(playing){pausePreview();return;}
    setViewing(true);setError('');setPlaying(true);
    if(playhead>=totalDuration-.05){setPlayhead(0);setActive(0);}
    let last=performance.now();clearInterval(previewTimer.current);
    previewTimer.current=setInterval(()=>{
      const now=performance.now(),delta=Math.min(.25,(now-last)/1000);last=now;
      setPlayhead(old=>{
        const next=old+delta;
        if(next>=durationTotal(slidesRef.current)){setTimeout(pausePreview,0);return durationTotal(slidesRef.current);}
        const nextClip=clipAtTime(slidesRef.current,next);
        if(nextClip.index!==clipAtTime(slidesRef.current,old).index){setActive(nextClip.index);videoRef.current?.pause();audioRef.current?.pause();}
        return next;
      });
    },100);
  };
  const publish=async()=>{
    if(busy)return;
    if(totalDuration>60.00001||totalDuration<.5){setError('The total story timeline must be between 0.5 and 60 seconds.');return;}
    const controller=new AbortController();abortRef.current=controller;
    setBusy(true);setError('');pausePreview();
    try{
      const payload=[];
      for(let i=0;i<slidesRef.current.length;i++){
        const current=slidesRef.current[i];let mediaId=current.mediaId;
        const layers=[];
        for(const layer of current.layers){
          if(layer.type==='image'&&layer.file){
            setProgress(`Clip ${i+1}: optimizing custom image sticker`);
            const asset=await uploadMedia(layer.file,'story',null,controller.signal);
            await waitForMedia(asset.id,null,controller.signal);
            const {file,previewUrl,...ready}=layer;layers.push({...ready,mediaId:asset.id});
          }else{const {file,previewUrl,...ready}=layer;layers.push(ready);}
        }
        if(current.file&&!mediaId){
          setProgress(`Clip ${i+1}/${slidesRef.current.length}: uploading`);
          // Retain untrimmed optimized media for splitting and reordered segments.
          // Render job applies trimStart and speed to the final MP4.
          const uploaded=await uploadMedia(current.file,'story',p=>setProgress(`Clip ${i+1}: Upload ${p}%`),controller.signal,stage=>setProgress(`Clip ${i+1}: ${stage}`));
          mediaId=uploaded.id;
          await waitForMedia(mediaId,item=>setProgress(`Clip ${i+1}: optimizing ${item.progress||0}%`),controller.signal);
          const saved=slidesRef.current.map(c=>c.file===current.file?{...c,mediaId}:c);commitSlides(saved,false);
        }
        payload.push({id:current.id,mediaId:mediaId||null,mediaKind:current.mediaKind,duration:current.duration,visibility:current.visibility,
          speed:Number(current.speed||1),transition:current.transition||'cut',effectPreset:current.effectPreset||'none',overlayAnimation:current.overlayAnimation||'none',
          trimStart:Number(current.effects.trimStart||0),effects:current.effects,layers,
          music:current.music?{trackId:current.music.trackId,start:current.music.start,volume:current.music.volume,originalVolume:current.music.originalVolume??1,style:current.music.style,fadeIn:current.music.fadeIn||0,fadeOut:current.music.fadeOut||0,x:current.music.x,y:current.music.y,size:current.music.size||1}:null});
      }
      const interactive=payload.some(x=>x.layers.some(l=>!['text','emoji','drawing','image'].includes(l.type)));
      if(outputMode==='interactive'||promptSource){
        setProgress('Publishing interactive story slides...');
        await create('/stories/batch',{slides:payload.map(({id,speed,transition,effectPreset,overlayAnimation,trimStart,...clip})=>({...clip,effects:{...clip.effects,trimStart:0,trimEnd:clip.duration}})),...(promptSource?{promptSource:{storyId:promptSource.storyId,stickerId:promptSource.stickerId}}:{})});
      }else{
        if(interactive)throw new Error('Video export cannot bake polls, links, external GIF stickers, or other interactive elements. Select Interactive Slides to publish those.');
        setProgress('Submitting 1080 × 1920 MP4 render...');
        const requestId=latestRequestId.current||`studio_${crypto.randomUUID().replaceAll('-','')}`;
        latestRequestId.current=requestId;
        const job=await create('/stories/renders',{requestId,visibility:payload[0].visibility,clips:payload.map(({visibility,...clip})=>clip)});
        setRenderStatus(job.status);
        let complete=false;
        for(let attempt=0;attempt<1000;attempt++){
          if(controller.signal.aborted)throw new Error('Stopped waiting for render. The render may still finish on the server.');
          const state=await read(`/stories/renders/${job.id}`);
          setRenderStatus(state.status);setProgress(`Rendering vertical MP4: ${state.status} ${state.progress||0}%`);
          if(state.status==='ready'){complete=true;break;}
          if(state.status==='failed')throw new Error(state.error||'Story rendering failed. Your draft is preserved.');
          await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,1800);controller.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('Stopped waiting for render.'));},{once:true});});
        }
        if(!complete)throw new Error('Render is still processing. Check status before resubmitting.');
      }
      await clearDraft().catch(()=>{});latestRequestId.current=null;
      onPublished?.();onClose?.();
    }catch(e){setError(errorText(e));}finally{setBusy(false);abortRef.current=null;setProgress('');}
  };
  const moveTimeline=(from,to)=>{if(to<0||to>=slidesRef.current.length)return;const changed=moveClip(slidesRef.current,from,to);commitSlides(changed);setActive(to);};
  const splitTimeline=()=>{
    const offset=slidesRef.current.slice(0,active).reduce((sum,c)=>sum+c.duration,0);
    const at=playhead-offset;const point=at>=.5&&at<=slide.duration-.5?at:slide.duration/2;
    const changed=splitClip(slidesRef.current,active,point,uid());if(changed===slidesRef.current){setError('Cannot split this clip at the selected point.');return;}
    commitSlides(changed);setActive(active+1);
  };
  const duplicateTimeline=()=>{const changed=duplicateClip(slidesRef.current,active,uid());if(changed===slidesRef.current){setError('Cannot duplicate: 60-second limit or 10-clip limit.');return;}commitSlides(changed);setActive(active+1);};
  const setClipDuration=(duration)=>{
    if(!canSetDuration(slidesRef.current,active,duration)){setError('Total story duration cannot exceed 60 seconds.');return;}
    if(slide.mediaKind==='video'&&slide.sourceDuration&&slide.effects.trimStart+duration*(slide.speed||1)>slide.sourceDuration+.1){setError('Trim the video or reduce the clip duration.');return;}
    commitSlides(withDuration(slidesRef.current,active,duration));setError('');
  };
  const putLayer=(key,val)=>selected&&mutateLayer(selected.id,{[key]:val});
  const tabs=['edit','stickers','adjust'];
  const isVideo=slide.mediaKind==='video';
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Create AEVORA story" className="fixed inset-0 z-[100] flex flex-col bg-[#0b0b15] text-white">
    <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 sm:px-6"><button type="button" onClick={onClose} disabled={busy} className="flex items-center gap-2 text-sm"><ArrowLeft size={19}/> Back</button><h2 className="font-bold">{promptSource?.prompt?`Add yours: ${promptSource.prompt}`:'Story Studio'} <span className="text-xs font-normal text-white/60">{active+1} / {slides.length} · {formatTime(totalDuration)} / 01:00</span></h2><div className="flex gap-1"><button type="button" className={editorButton} disabled={busy} onClick={()=>saveDraft(slides).then(()=>setDraftSaved(true)).catch(()=>setError('Draft could not be saved.'))}>Save draft</button><button type="button" className={editorButton} disabled={busy} onClick={publish}>Publish</button><button type="button" aria-label="Undo" disabled={!history.length||busy} onClick={undo} className={editorButton}><Undo2 size={16}/></button><button type="button" aria-label="Redo" disabled={!future.length||busy} onClick={redo} className={editorButton}><Redo2 size={16}/></button></div></header>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black/30 p-2 sm:p-4" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files?.length)addFiles(e.dataTransfer.files);}}>
        <div className="relative max-h-full max-w-full shrink-0 overflow-hidden" style={{width:'min(100%, 400px, calc(60dvh * 9 / 16))',aspectRatio:'9 / 16'}}>
          <StoryCanvas slide={slide} mediaUrl={slide.file?urls.get(slide.id):slide.mediaId?mediaFile(slide.mediaId):null} videoRef={videoRef} editing={!viewing} selectedLayerId={selectedId} onSelectLayer={setSelectedId} onMoveLayer={(id,pos)=>mutateLayer(id,pos,false)} onResizeLayer={(id,size)=>mutateLayer(id,{size},false)} onMoveMusic={pos=>update({music:{...slide.music,...pos}},false)} muted={!playing} playbackElapsed={playhead - slides.slice(0,active).reduce((sum,x)=>sum+x.duration,0)}/>
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
          {tab==='edit'&&<><label className="block">Audience<select value={slide.visibility} className="mt-1 block w-full rounded-lg bg-slate-800 p-2" onChange={e=>update({visibility:e.target.value})}><option value="public">Everyone</option><option value="friends">Friends</option><option value="followers">Followers</option></select></label><label className="block">Clip duration (seconds)<input aria-label="Clip duration seconds" type="number" min="0.5" max={Math.min(60,slide.duration+remainingDuration)} step="0.5" className="ml-2 w-20 rounded bg-slate-800 p-1" value={slide.duration} onChange={e=>setClipDuration(Number(e.target.value))}/></label>
            <label className="block">Playback speed<select aria-label="Clip speed" className="ml-2 rounded bg-slate-800 p-1" value={slide.speed||1} onChange={e=>{const speed=Number(e.target.value);if(isVideo&&slide.sourceDuration&&slide.effects.trimStart+slide.duration*speed>slide.sourceDuration){setError('Trim video to use this speed.');return;}update({speed});}}>{[0.5,0.75,1,1.25,1.5,2].map(x=><option value={x} key={x}>{x}×</option>)}</select></label>
            <label className="block">Transition<select aria-label="Clip transition" className="ml-2 rounded bg-slate-800 p-1" value={slide.transition||'cut'} onChange={e=>update({transition:e.target.value})}><option value="cut">Cut</option><option value="fade">Fade through black</option></select></label>
            <label className="block">Text & sticker animation<select aria-label="Overlay animation" className="ml-2 rounded bg-slate-800 p-1" value={slide.overlayAnimation||'none'} onChange={e=>update({overlayAnimation:e.target.value})}><option value="none">None</option><option value="fade">Fade in</option><option value="rise">Rise in</option></select></label>
            <label className="block">Video effect<select aria-label="Clip effect" className="ml-2 rounded bg-slate-800 p-1" value={slide.effectPreset||'none'} onChange={e=>update({effectPreset:e.target.value})}><option value="none">None</option><option value="cinematic">Cinematic</option><option value="monochrome">Black & white</option><option value="blur">Soft blur</option><option value="glow">Glow</option></select></label>
            {isVideo&&<><p className="text-xs">Video clip selection</p><label className="block text-xs">Start: {slide.effects.trimStart.toFixed(1)}s<input type="range" className="block w-full" min={0} max={Math.max(0,(slide.sourceDuration||60)-3)} step=".5" value={slide.effects.trimStart} onChange={e=>{const start=Number(e.target.value);const end=Math.min(slide.sourceDuration||60,Math.max(start+3,start+Math.min(60,slide.duration)));update({effects:{...slide.effects,trimStart:start,trimEnd:end},duration:Math.min(slide.duration,(end-start)/(slide.speed||1))},false);}}/></label><label className="block text-xs">End: {slide.effects.trimEnd.toFixed(1)}s<input type="range" className="block w-full" min={Math.min(slide.sourceDuration||60,slide.effects.trimStart+3)} max={slide.sourceDuration||60} step=".5" value={slide.effects.trimEnd||Math.min(slide.sourceDuration||60,15)} onChange={e=>{const end=Number(e.target.value);update({effects:{...slide.effects,trimEnd:end},duration:Math.min(slide.duration,(end-slide.effects.trimStart)/(slide.speed||1))},false);}}/></label></>}
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
    <footer className="border-t border-white/10 bg-[#141420] px-3 py-2 sm:px-6"><StoryTimeline clips={slides} active={active} busy={busy} playhead={playhead} onSelect={i=>{pausePreview();setActive(i);setSelectedId(null);setPlayhead(slides.slice(0,i).reduce((sum,x)=>sum+x.duration,0));}} onMove={moveTimeline} onSplit={splitTimeline} onDuplicate={duplicateTimeline} onDelete={removeSlide} onSeek={seekTo} previewUrls={urls}/><div className="mt-2 mb-2 flex gap-2"><button className={editorButton} type="button" onClick={addSlide} disabled={busy||slides.length>=10||remainingDuration<.5}><Plus size={15} className="inline"/> Add text clip</button><button className={editorButton} type="button" onClick={()=>fileRef.current?.click()} disabled={busy}><ImagePlus size={15} className="inline"/> Add media</button></div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs"><label>Publish as <select value={outputMode} onChange={e=>setOutputMode(e.target.value)} className="ml-2 rounded bg-slate-800 p-1"><option value="mp4">One 1080 × 1920 MP4</option><option value="interactive">Interactive slides</option></select></label><span className="text-white/50">{draftSaved?'Draft autosaved locally':'Draft saves in this browser'}</span></div>
      {progress&&<div className="mb-1 flex items-center justify-between gap-2"><p className="text-xs text-indigo-200" role="status"><LoaderCircle size={13} className="mr-1 inline animate-spin"/>{progress}</p>{busy&&<button type="button" className="text-xs underline" onClick={()=>abortRef.current?.abort()}>{renderStatus==='rendering'||renderStatus==='uploading'?'Stop waiting':'Cancel upload'}</button>}</div>}{error&&<p role="alert" className="mb-1 text-xs text-red-300">{error}</p>}
      <button type="button" disabled={busy} onClick={publish} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?`Processing: ${renderStatus||'upload'}...`:outputMode==='mp4'?'Render MP4 & publish for 24h':`Share ${slides.length} interactive slide${slides.length===1?'':'s'} for 24h`}</button>
    </footer>
    {draftPrompt&&<div role="dialog" aria-label="Restore unfinished story" className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/20 bg-[#1b1b2a] p-6"><h3 className="text-lg font-bold">Continue your story?</h3><p className="text-sm text-white/70">An unfinished story was saved in this browser. Restore the clips and edits, or start a new story.</p><button type="button" className="w-full rounded-xl bg-indigo-600 p-3 font-semibold" onClick={restoreDraft}>Restore draft</button><button type="button" className="w-full rounded-xl border border-white/20 p-3" onClick={discardDraft}>Start new story</button></div></div>}
    {musicOpen&&<StoryMusicPicker duration={slide.duration} selected={slide.music} onClose={()=>setMusicOpen(false)} onSelect={music=>{update({music});setMusicOpen(false);}}/>}
    {gifOpen&&<div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Find GIF stickers"><div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 text-slate-900"><div className="flex justify-between"><strong>GIF stickers</strong><button type="button" onClick={()=>setGifOpen(false)}><X size={17}/></button></div><div className="my-3 flex gap-2"><input className="min-w-0 flex-1 rounded border px-2" placeholder="Search animated stickers" value={gifTerm} onChange={e=>setGifTerm(e.target.value)}/><button className="rounded bg-indigo-600 px-3 text-white" onClick={addGif} disabled={gifBusy}>Search</button></div><div className="grid grid-cols-2 gap-2">{gifs.map(g=><button key={g.id} onClick={()=>{const layer={...defaultLayer('gif'),url:g.url};change(v=>({...v,layers:[...v.layers,layer]}));setSelectedId(layer.id);setGifOpen(false);}}><img alt={g.description||'GIF'} src={g.previewUrl} loading="lazy" className="aspect-square w-full object-contain"/></button>)}</div>{gifBusy&&<p>Loading GIFs...</p>}</div></div>}
    {cameraOpen&&<div className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-black p-4" role="dialog" aria-label="Capture story"><button type="button" onClick={closeCamera} className="self-end"><X/></button><video ref={cameraRef} playsInline muted className="max-h-[70vh] rounded-xl"/><div className="flex gap-3"><button type="button" onClick={capturePhoto} className={editorButton}>Take photo</button><button type="button" onClick={toggleRecording} className={editorButton}>{recording?'Stop recording':'Record video (60s max)'}</button></div></div>}
  </div>,document.body);
}
