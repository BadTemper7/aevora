import { ChevronLeft,ChevronRight,Plus } from 'lucide-react';
import { useEffect,useMemo,useRef,useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import Avatar from '../../../../components/ui/Avatar';
import { cn } from '../../../../utils/cn';
import { errorText,read } from '../../api/socialApi';
import StoryEditor from '../stories/StoryEditor';
import StoryViewer from '../stories/StoryViewer';
function StoryRing({seen,children}){return <span className={cn('grid size-[68px] place-items-center rounded-full p-[3px]',seen?'bg-line-strong':'bg-gradient-to-tr from-[#3f68f5] via-[#7c4df0] to-[#c04bd8]')}><span className="grid size-full place-items-center rounded-full bg-surface p-[2px]">{children}</span></span>;}
/** Preserves AEVORA's existing story rail; editor and viewer are its fullscreen overlays. */
export default function StoryRail({user}){
  const query=useQuery({queryKey:['stories'],queryFn:()=>read('/stories'),staleTime:20_000,refetchInterval:60_000});
  const client=useQueryClient();const stories=useMemo(()=>query.data||[],[query.data]);
  const groups=useMemo(()=>{
    const map=new Map();for(const story of stories){const key=story.ownerId;const group=map.get(key)||[];group.push(story);map.set(key,group);}return [...map.values()].sort((a,b)=>(a[0].ownerId===user?.id?-1:0)-(b[0].ownerId===user?.id?-1:0));
  },[stories,user?.id]);
  const scrollRef=useRef(null);const [viewGroup,setViewGroup]=useState(null);const [creating,setCreating]=useState(false);const [promptSource,setPromptSource]=useState(null);const [canLeft,setCanLeft]=useState(false);const [canRight,setCanRight]=useState(false);
  useEffect(()=>{const elem=scrollRef.current;if(!elem)return;const check=()=>{setCanLeft(elem.scrollLeft>1);setCanRight(elem.scrollLeft+elem.clientWidth<elem.scrollWidth-1);};check();window.addEventListener('resize',check);return()=>window.removeEventListener('resize',check);},[groups.length]);
  const viewerGroup=groups.find(group=>group.some(s=>s.id===viewGroup));
  return <><section aria-label="Stories" className="rounded-2xl border border-line bg-surface px-4 pb-3 pt-4"><div className="flex items-center gap-3 sm:gap-4"><button type="button" onClick={()=>{setPromptSource(null);setCreating(true);}} className="group flex w-[76px] shrink-0 flex-col items-center gap-2" aria-label="Create a story"><span className="relative"><Avatar name={user?.name} size="lg" className="size-[68px] text-2xl"/><span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border-2 border-surface bg-brand text-on-brand transition-transform group-hover:scale-110"><Plus size={15}/></span></span><span className="w-full truncate text-center text-xs font-medium text-ink">Add story</span></button><div className="relative min-w-0 flex-1">{canLeft&&<button type="button" aria-label="Scroll stories left" onClick={()=>scrollRef.current?.scrollBy({left:-220,behavior:'smooth'})} className="absolute left-1 top-4 z-10 grid size-8 place-items-center rounded-full border border-line bg-surface shadow"><ChevronLeft size={18}/></button>}{canRight&&<button type="button" aria-label="Scroll stories right" onClick={()=>scrollRef.current?.scrollBy({left:220,behavior:'smooth'})} className="absolute right-1 top-4 z-10 grid size-8 place-items-center rounded-full border border-line bg-surface shadow"><ChevronRight size={18}/></button>}
      <ul ref={scrollRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto py-1 sm:gap-4" onScroll={e=>{const el=e.currentTarget;setCanLeft(el.scrollLeft>1);setCanRight(el.scrollLeft+el.clientWidth<el.scrollWidth-1);}}>{groups.map(group=>{const first=group.find(s=>!s.seen)||group[0];const seen=group.every(s=>s.seen);return <li key={group[0].ownerId} className="snap-start"><button type="button" onClick={()=>setViewGroup(first.id)} className="flex w-[76px] flex-col items-center gap-2" aria-label={`View ${first.author?.name||'user'}'s stories`}><StoryRing seen={seen}><Avatar size="lg" name={first.author?.name} src={first.author?.image} className="size-full text-xl"/></StoryRing><span className={cn('w-full truncate text-center text-xs',seen?'text-ink-soft':'font-semibold text-ink')}>{first.ownerId===user?.id?'Your story':(first.author?.name||'User').split(' ')[0]}</span></button></li>;})}</ul>{!query.isPending&&!groups.length&&<p className="px-2 py-5 text-sm text-ink-soft">Share a story to get started.</p>}</div></div>{query.error&&<p role="alert" className="mt-2 text-xs text-danger">{errorText(query.error)}</p>}</section>
    {viewerGroup&&<StoryViewer stories={viewerGroup} initialId={viewGroup} user={user} onClose={()=>setViewGroup(null)} onAddYours={(source)=>{setViewGroup(null);setPromptSource(source);setCreating(true);}}/>}
    {creating&&<StoryEditor promptSource={promptSource} onClose={()=>setCreating(false)} onPublished={()=>client.invalidateQueries({queryKey:['stories']})}/>}
  </>;
}
