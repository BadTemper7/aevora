export const MAX_STORY_SECONDS=60;
export const MAX_STORY_CLIPS=10;
export const durationTotal=clips=>clips.reduce((sum,clip)=>sum+Number(clip.duration||0),0);
export const availableTime=clips=>Math.max(0,MAX_STORY_SECONDS-durationTotal(clips));
export const formatTime=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export const canSetDuration=(clips,index,next)=>Number.isFinite(next)&&next>=.5&&durationTotal(clips)-Number(clips[index].duration)+next<=MAX_STORY_SECONDS+.00001;
export const withDuration=(clips,index,duration)=>canSetDuration(clips,index,duration)?clips.map((clip,i)=>i===index?{...clip,duration}:clip):clips;
export function moveClip(clips,from,to){if(from===to||from<0||to<0||from>=clips.length||to>=clips.length)return clips;const copy=clips.slice();const [item]=copy.splice(from,1);copy.splice(to,0,item);return copy;}
export function splitClip(clips,index,at,newId){const clip=clips[index];if(!clip||clips.length>=MAX_STORY_CLIPS||at<.5||at>clip.duration-.5)return clips;const left={...clip,duration:at};const right={...clip,id:newId,duration:clip.duration-at,transition:'cut',effects:{...clip.effects,trimStart:(clip.effects?.trimStart||0)+at*Number(clip.speed||1)},music:clip.music?{...clip.music,start:clip.music.start+at}:null,layers:clip.layers.map(layer=>({...layer,id:`${newId}_${layer.id}`.slice(0,64)}))};return [...clips.slice(0,index),left,right,...clips.slice(index+1)];}
export function duplicateClip(clips,index,id){const source=clips[index];if(!source||clips.length>=MAX_STORY_CLIPS||availableTime(clips)<source.duration)return clips;const copy={...source,id,layers:source.layers.map(layer=>({...layer,id:`${id}_${layer.id}`.slice(0,64)}))};return [...clips.slice(0,index+1),copy,...clips.slice(index+1)];}
export const clipAtTime=(clips,time)=>{let offset=0;for(let i=0;i<clips.length;i++){if(time<offset+clips[i].duration || i===clips.length-1)return {index:i,local:Math.max(0,time-offset),start:offset};offset+=clips[i].duration;}return {index:0,local:0,start:0};};
