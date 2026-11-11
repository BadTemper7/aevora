import { useEffect,useRef,useState } from 'react';
import { Heart, LoaderCircle, Music2, Search, X } from 'lucide-react';
import { create, read, mediaFile, uploadMedia, waitForMedia, errorText } from '../../api/socialApi';
import { useDebounce } from '../../../../hooks/useDebounce';

const tabs = ['trending','recommended','favorites','recent','mine'];
export default function StoryMusicPicker({ onSelect, onClose, selected, duration=10 }) {
  const [tab,setTab] = useState('trending');
  const [term,setTerm] = useState('');
  const query = useDebounce(term,250);
  const [items,setItems] = useState([]);
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const [uploading,setUploading] = useState(false);
  const [form,setForm] = useState({ title:'',artist:'',genre:'Other',mood:'Other',visibility:'private',rightsType:'original',rightsConfirmed:false });
  const [file,setFile]=useState(null);
  const [cover,setCover]=useState(null);
  const [progress,setProgress] = useState('');
  const [start,setStart] = useState(selected?.start||0);
  const [volume,setVolume] = useState(selected?.volume??.7);
  const [fadeIn,setFadeIn]=useState(selected?.fadeIn||0);
  const [fadeOut,setFadeOut]=useState(selected?.fadeOut||0);
  const previewRef=useRef(null);
  const [style,setStyle] = useState(selected?.style||'title');
  const [track,setTrack] = useState(selected?.track||null);
  useEffect(()=>{let active=true;setPending(true);setError('');read('/story-music',{category:tab,q:query}).then(data=>active&&setItems(data||[])).catch(e=>active&&setError(errorText(e))).finally(()=>active&&setPending(false));return()=>{active=false;};},[tab,query]);
  const setFavorite = async (candidate) => {
    try { await create(`/story-music/${candidate.id}/favorite`,{favorite:!candidate.favorite});setItems(list=>list.map(x=>x.id===candidate.id?{...x,favorite:!x.favorite}:x)); }
    catch(e){setError(errorText(e));}
  };
  const upload = async (event) => {
    event.preventDefault();if(!file||!form.rightsConfirmed||uploading)return;
    setUploading(true);setError('');
    try {
      setProgress('Uploading and optimizing audio...');
      const item=await uploadMedia(file,'story_audio',p=>setProgress(`Audio upload ${p}%`));
      await waitForMedia(item.id,record=>setProgress(`Processing audio ${record.progress||0}%`));
      let coverId=null;
      if(cover){setProgress('Uploading music artwork...');const uploaded=await uploadMedia(cover,'story');await waitForMedia(uploaded.id);coverId=uploaded.id;}
      const created=await create('/story-music',{...form,mediaId:item.id,coverId});
      setItems(list=>[created,...list]);setTab('mine');setFile(null);setCover(null);setTrack(created);setStart(0);
      setProgress('Track is ready. Select your clip below.');
    } catch(e){setError(errorText(e));}finally{setUploading(false);}
  };
  const durationLimit = Math.max(0,Number(track?.duration||0)-duration);
  return <section role="dialog" aria-label="Story music library" className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-2 text-slate-900 sm:p-4" onPointerDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b px-4 py-3"><h2 className="flex items-center gap-2 font-bold"><Music2 size={20}/> Music for stories</h2><button type="button" aria-label="Close music picker" onClick={onClose}><X size={20}/></button></header>
      <p className="px-4 pt-2 text-xs text-slate-600">Only original music and tracks with explicit story synchronization and distribution rights are available.</p>
      <div className="px-4 py-3"><label className="flex items-center gap-2 rounded-xl border px-3 py-2"><Search size={18}/><input aria-label="Search music" className="w-full outline-none" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Search title, artist, mood or genre"/></label></div>
      <nav className="flex gap-1 overflow-x-auto border-b px-4 pb-2">{tabs.map(key=><button key={key} type="button" onClick={()=>setTab(key)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${tab===key?'bg-indigo-600 text-white':'bg-slate-100'}`}>{key}</button>)}</nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {pending&&<p className="flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={16}/> Loading tracks...</p>}
        {error&&<p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
        {!pending&&!items.length&&<p className="py-4 text-center text-sm text-slate-500">No licensed tracks in this category yet. You can upload original audio below.</p>}
        <ul className="space-y-2">{items.map(candidate=><li key={candidate.id} className={`flex items-center gap-3 rounded-xl border p-2 ${track?.id===candidate.id?'border-indigo-600 bg-indigo-50':''}`}>
          {candidate.coverId ? <img src={mediaFile(candidate.coverId)} className="size-11 rounded-lg object-cover" alt="Track artwork"/> : <div className="grid size-11 place-items-center rounded-lg bg-indigo-100"><Music2/></div>}
          <button type="button" onClick={()=>{setTrack(candidate);setStart(0);}} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{candidate.title}</span><span className="block truncate text-xs text-slate-500">{candidate.artist} · {candidate.genre} · {Math.round(candidate.duration)}s</span></button>
          <button type="button" aria-label={candidate.favorite?'Remove favorite':'Add favorite'} onClick={()=>setFavorite(candidate)} className={candidate.favorite?'text-pink-600':'text-slate-500'}><Heart size={19} fill={candidate.favorite?'currentColor':'none'}/></button>
        </li>)}</ul>
        <form onSubmit={upload} className="mt-5 space-y-2 rounded-xl border bg-slate-50 p-3"><strong className="block text-sm">Add your original or licensed music</strong>
          <div className="grid grid-cols-2 gap-2"><input required maxLength={120} placeholder="Track title" className="min-w-0 rounded border p-2 text-sm" value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value}))}/><input required maxLength={120} placeholder="Artist" className="min-w-0 rounded border p-2 text-sm" value={form.artist} onChange={e=>setForm(v=>({...v,artist:e.target.value}))}/><input placeholder="Genre" className="min-w-0 rounded border p-2 text-sm" value={form.genre} onChange={e=>setForm(v=>({...v,genre:e.target.value}))}/><input placeholder="Mood" className="min-w-0 rounded border p-2 text-sm" value={form.mood} onChange={e=>setForm(v=>({...v,mood:e.target.value}))}/></div>
          <label className="block text-xs">Audio file (MP3, M4A, WAV, OGG; up to 15 MB) <input className="block w-full py-1" type="file" accept="audio/*" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
          <label className="block text-xs">Optional cover art <input className="block w-full py-1" type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)}/></label>
          <div className="flex gap-2"><label className="flex-1 text-xs">Rights<select value={form.rightsType} onChange={e=>setForm(v=>({...v,rightsType:e.target.value}))} className="block w-full rounded border bg-white p-1"><option value="original">I created this music</option><option value="licensed">I hold synchronization and distribution rights</option></select></label><label className="flex-1 text-xs">Catalog visibility<select value={form.visibility} onChange={e=>setForm(v=>({...v,visibility:e.target.value}))} className="block w-full rounded border bg-white p-1"><option value="private">Only me</option><option value="public">AEVORA music library</option></select></label></div>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={form.rightsConfirmed} onChange={e=>setForm(v=>({...v,rightsConfirmed:e.target.checked}))}/> I own or have written permission to synchronize, reproduce, and distribute this music in stories.</label>
          <button type="submit" disabled={!file||!form.rightsConfirmed||uploading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{uploading?'Processing...':'Upload licensed track'}</button>{progress&&<p role="status" className="text-xs">{progress}</p>}
        </form>
      </div>
      {track&&<footer className="space-y-2 border-t bg-slate-50 p-4"><p className="text-sm font-semibold">Selected: {track.title} · {track.artist}</p><audio ref={previewRef} key={track.mediaId} src={mediaFile(track.mediaId)} controls preload="metadata" onLoadedMetadata={e=>{e.currentTarget.currentTime=Math.min(start,track.duration);}} onTimeUpdate={e=>{if(e.currentTarget.currentTime>=start+duration)e.currentTarget.pause();}} className="h-9 w-full"/><label className="block text-xs">Clip starts at {start.toFixed(1)}s and ends at {(start+duration).toFixed(1)}s<input className="w-full accent-indigo-600" type="range" min="0" max={Math.max(0,durationLimit)} step="0.5" value={Math.min(start,durationLimit)} onChange={e=>{const next=Number(e.target.value);setStart(next);if(previewRef.current)previewRef.current.currentTime=next;}}/></label>
        <div className="flex items-center gap-3 text-xs"><label className="flex-1">Music volume {Math.round(volume*100)}%<input type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))} className="block w-full"/></label><label className="flex-1">Sticker style<select className="block w-full rounded border p-1" value={style} onChange={e=>setStyle(e.target.value)}><option value="cover">Cover</option><option value="title">Title + artist</option><option value="minimal">Minimal</option><option value="animated">Animated</option><option value="hidden">Hide sticker</option></select></label></div>
        <div className="flex gap-3 text-xs"><label className="flex-1">Fade in {fadeIn}s<input className="block w-full" type="range" min="0" max="3" step=".5" value={fadeIn} onChange={e=>setFadeIn(Number(e.target.value))}/></label><label className="flex-1">Fade out {fadeOut}s<input className="block w-full" type="range" min="0" max="3" step=".5" value={fadeOut} onChange={e=>setFadeOut(Number(e.target.value))}/></label></div>
        <button type="button" disabled={duration>track.duration} onClick={()=>onSelect({trackId:track.id,track,start:Math.min(start,durationLimit),volume,originalVolume:1,style,fadeIn,fadeOut,x:50,y:82,size:1})} className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Use selected music</button>
      </footer>}
    </div>
  </section>;
}
