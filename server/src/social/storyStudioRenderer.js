/** Story Studio: bounded FFmpeg render queue. All inputs are ready, owner-authorized media.
 * No client-controlled paths are ever passed to FFmpeg; command arguments are not shell-expanded.
 * Builds one 1080x1920 MP4 and publishes only after verifying the optimized ImageKit object.
 */
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import sharp from 'sharp';
import { Media, StoryMusic, SocialStory, StoryRenderJob } from './models.js';
import { storageMode, streamPrivateObject, putPrivateObject, deletePrivateObject, objectPrefix } from '../storage/imagekit.js';
import { mediaPath, ensureMediaFolders } from '../media/processor.js';
import { durationOf, STORY_WIDTH as W, STORY_HEIGHT as H } from './storyStudioRules.js';

const FPS=24;
function overlayFilter(clip){const a=clip.overlayAnimation||'none';const fade=a==='fade'?',fade=t=in:st=0:d=0.3:alpha=1':'';const y=a==='rise'?"'if(lt(t,0.4),40*(1-t/0.4),0)'":'0';return {fade,y};}
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const bounded=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const xml = value => String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function run(command,args,onProgress){return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let out='',err='',buffer='';
  const timer=setTimeout(()=>child.kill('SIGKILL'),Math.max(60,Number(process.env.STORY_RENDER_TIMEOUT_SEC||1200))*1000);
  child.stdout.on('data',x=>{out=(out+String(x)).slice(-8000);});
  child.stderr.on('data',x=>{err=(err+String(x)).slice(-4000);buffer=(buffer+String(x)).slice(-8000);if(onProgress){for(const m of buffer.matchAll(/out_time_(?:ms|us)=(\d+)/g))onProgress(Number(m[1])/1e6);buffer=buffer.slice(-60);}});
  child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('close',code=>{clearTimeout(timer);code===0?resolve(out):reject(new Error(`${command} exited ${code}: ${err.slice(-500)}`));});
});}
const ffmpeg=(args,onProgress)=>run(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-nostdin','-loglevel','error','-y',...(onProgress?['-progress','pipe:2']:[]),...args],onProgress);
const ffprobe=async input=>JSON.parse(await run(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',input]));
const filenameSafe=(name)=>String(name).replace(/[^a-z0-9._-]/gi,'_');

export function videoFilter(clip){
  const e=clip.effects||{};
  const fit=e.fit==='cover'?'increase':'decrease';
  let filter=`fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=${fit},${fit==='increase'?`crop=${W}:${H}`:`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${(e.background||'#17172b').replace('#','0x')}`},setsar=1`;
  if(Number(e.zoom||1)>1){const z=bounded(e.zoom,1,3);filter+=`,scale=iw*${z}:ih*${z}:flags=bicubic,crop=${W}:${H}:(iw-ow)*${bounded(e.positionX??50,0,100)/100}:(ih-oh)*${bounded(e.positionY??50,0,100)/100}`;}
  if(e.rotate)filter+=`,rotate=${(bounded(e.rotate,-180,180)*Math.PI/180).toFixed(6)}:fillcolor=black`;
  const adjust=[bounded((e.brightness??1)-1,-.7,.7),bounded(e.contrast??1,.3,2),bounded(e.saturation??1,0,3)];
  filter+=`,eq=brightness=${adjust[0]}:contrast=${adjust[1]}:saturation=${adjust[2]}`;
  if(clip.effectPreset==='cinematic')filter+=`,vignette=PI/5,eq=contrast=1.12:saturation=0.9`;
  if(clip.effectPreset==='monochrome')filter+=',hue=s=0';
  if(clip.effectPreset==='blur')filter+=',boxblur=3:1';
  if(clip.effectPreset==='glow')filter+=',unsharp=5:5:0.7:5:5:0.0';
  return filter;
}
function fadeFilter(clip){const d=clip.duration;if(clip.transition!=='fade')return '';const t=Math.min(.24,d/5);return `,fade=t=in:st=0:d=${t},fade=t=out:st=${Math.max(0,d-t)}:d=${t}`;}
const resizeImage=async (filename,clip)=>{
  const e=clip.effects||{};const background=e.background||'#17172b';
  const source=sharp(filename,{animated:false,limitInputPixels:60_000_000}).rotate();
  const info=await source.metadata();
  const z=bounded(e.zoom||1,1,3);const desiredW=Math.round(W*z);const desiredH=Math.round(H*z);
  const image=await sharp(filename,{animated:false}).rotate().resize({width:desiredW,height:desiredH,fit:e.fit==='cover'?'cover':'contain',position:'centre',background}).png().toBuffer();
  const xpos=Math.round((desiredW-W)*bounded(e.positionX??50,0,100)/100);const ypos=Math.round((desiredH-H)*bounded(e.positionY??50,0,100)/100);
  const plate=sharp({create:{width:W,height:H,channels:4,background}});
  const layer=z>1?await sharp(image).extract({left:xpos,top:ypos,width:W,height:H}).png().toBuffer():image;
  const output=await plate.composite([{input:layer,left:0,top:0}]).png().toBuffer();
  return sharp(output).modulate({brightness:bounded(e.brightness??1,.3,2),saturation:bounded(e.saturation??1,0,3)}).linear(bounded(e.contrast??1,.3,2),128*(1-bounded(e.contrast??1,.3,2))).png().toBuffer();
};
function svgLayers(layers,musicSticker=null){let markup=layers.filter(l=>['text','emoji','drawing'].includes(l.type)).map(l=>{
  if(l.type==='drawing')return `<path d="${xml(l.path)}" fill="none" stroke="${xml(l.color||'#fff')}" stroke-width="${bounded(l.strokeWidth||1,.2,8)*10.8}" stroke-linecap="round" transform="scale(10.8)"/>`;
  const x=bounded(l.x??50,0,100)*W/100;const y=bounded(l.y??50,0,100)*H/100;
  const rotation=bounded(l.rotation||0,-180,180);const scale=bounded(l.size||1,.3,3);
  const content=l.type==='text'?String(l.text||'').split('\n').slice(0,8).map((line,i)=>`<tspan x="0" dy="${i?1.25:0}em">${xml(line.slice(0,120))}</tspan>`).join('') : xml(l.emoji||'');
  const font=l.font==='mono'?'monospace':l.font==='serif'?'serif':'sans-serif';
  const fontsize=l.type==='emoji'?110:Math.round(52*scale);
  const anchor=l.align==='left'?'start':l.align==='right'?'end':'middle';
  const fill=l.color||'#fff';const background=l.background?`<rect x="-290" y="-50" width="580" height="84" rx="12" fill="${xml(l.background)}" fill-opacity=".85"/>`:'';
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">${background}<text x="0" y="0" text-anchor="${anchor}" dominant-baseline="middle" font-family="${font}" font-size="${fontsize}" font-weight="${l.bold?'bold':'normal'}" font-style="${l.italic?'italic':'normal'}" fill="${xml(fill)}" stroke="#000" stroke-width="1" paint-order="stroke" opacity=".98">${content}</text></g>`;
}).join('');
 if(musicSticker && musicSticker.style!=='hidden'){
   const x=bounded(musicSticker.x??50,4,96)*W/100,y=bounded(musicSticker.y??82,5,95)*H/100;
   const scale=bounded(musicSticker.size||1,.5,2);
   const title=xml(String(musicSticker.title||'Music').slice(0,65)),artist=xml(String(musicSticker.artist||'').slice(0,65));
   const text=musicSticker.style==='minimal'?'♫':`♫ ${title} · ${artist}`;
   markup+=`<g transform="translate(${x},${y}) scale(${scale})"><rect x="-330" y="-27" width="660" height="54" rx="18" fill="#000" fill-opacity=".65"/><text text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="bold" font-size="23" fill="white">${text}</text></g>`;
 }
 return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${markup}</svg>`);}
async function overlayFile(clip,workspace,index,mediaById,trackById){
 const dest=path.join(workspace,`overlay-${index}.png`);
 const track=clip.music?trackById.get(clip.music.trackId):null;
 let layers=[{input:svgLayers(clip.layers||[],clip.music?{...clip.music,title:track?.title,artist:track?.artist}:null),top:0,left:0}];
 for(const layer of (clip.layers||[]))if(layer.type==='image'){
   const item=mediaById.get(layer.mediaId);if(!item)throw new Error('Sticker image is unavailable.');
   const input=await downloadMedia(item,workspace);
   const size=Math.max(40,Math.min(600,Math.round(240*(layer.size||1))));
   let png=await sharp(input,{animated:false}).resize(size,size,{fit:'inside'}).png().toBuffer();
   if(layer.rotation)png=await sharp(png).rotate(layer.rotation,{background:'transparent'}).png().toBuffer();
   const meta=await sharp(png).metadata();
   layers.push({input:png,left:Math.max(0,Math.min(W-meta.width,Math.round(W*(layer.x||50)/100-meta.width/2))),top:Math.max(0,Math.min(H-meta.height,Math.round(H*(layer.y||50)/100-meta.height/2)))});
 }
 await sharp({create:{width:W,height:H,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(dest);
 return dest;
}
async function downloadMedia(media,workspace){
  const dest=path.join(workspace,`${media._id}-${filenameSafe(media.kind)}.${media.kind==='video'?'mp4':media.kind==='audio'?'m4a':'webp'}`);
  if(media.storageProvider==='local'){await copyFile(mediaPath('processed',media.optimizedKey),dest);return dest;}
  const source=media.storageProvider==='imagekit'?await streamPrivateObject(media.objectKey):await (await import('../storage/r2.js')).streamPrivateObject(media.objectKey);
  await pipeline(source.Body,createWriteStream(dest));return dest;
}
function audioFilter({clip,hasAudio,musicIndex,silenceIndex}){
 const duration=clip.duration,vol=bounded(clip.music?.volume??.7,0,1);let filters=[];
 const music=musicIndex!==null ? `[${musicIndex}:a:0]atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=${vol}${clip.music?.fadeIn?`,afade=t=in:st=0:d=${clip.music.fadeIn}`:''}${clip.music?.fadeOut?`,afade=t=out:st=${Math.max(0,duration-clip.music.fadeOut)}:d=${clip.music.fadeOut}`:''}[music]`:null;
 if(music)filters.push(music);
 if(hasAudio)filters.push(`[0:a:0]atempo=${clip.speed},atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=${bounded(clip.music?.originalVolume??1,0,1)}[original]`);
 if(music&&hasAudio)filters.push('[original][music]amix=inputs=2:duration=longest:dropout_transition=0[aout]');
 else if(music)filters.push('[music]anull[aout]');
 else if(hasAudio)filters.push('[original]anull[aout]');
 else filters.push(`[${silenceIndex}:a:0]atrim=duration=${duration},asetpts=PTS-STARTPTS[aout]`);
 return filters.join(';');
}
async function renderClip({clip,index,workspace,mediaById,trackById,progress}){
 const source=clip.mediaId?mediaById.get(clip.mediaId):null;
 const media=source?await downloadMedia(source,workspace):null;
 const output=path.join(workspace,`part-${String(index).padStart(2,'0')}.mp4`);
 let args=[],videoPipeline='',videoIsInput=false;
 const plate=path.join(workspace,`plate-${index}.png`);
 const layer=await overlayFile(clip,workspace,index,mediaById,trackById);
 if(clip.mediaKind==='video'||clip.mediaKind==='gif'){
   const animated=clip.mediaKind==='gif';
   let input=media;
   if(animated){input=path.join(workspace,`anim-${index}.gif`);await sharp(media,{animated:true}).gif({effort:2}).toFile(input);}
   args=animated?['-stream_loop','-1','-i',input,'-loop','1','-framerate',String(FPS),'-i',layer]:['-ss',String(clip.trimStart||0),'-i',input,'-loop','1','-framerate',String(FPS),'-i',layer];
   videoIsInput=true;
   const animation=overlayFilter(clip);
   videoPipeline=`[0:v]${videoFilter(clip)},setpts=(PTS-STARTPTS)/${clip.speed},trim=duration=${clip.duration},setpts=PTS-STARTPTS[base];[1:v]format=rgba${animation.fade}[overlay];[base][overlay]overlay=x=0:y=${animation.y}:shortest=1,format=yuv420p${fadeFilter(clip)}[vout]`;
 }else{
   if(media){const image=await resizeImage(media,clip);await writeFile(plate,image);}
   else await sharp({create:{width:W,height:H,channels:4,background:clip.effects?.background||'#17172b'}}).png().toFile(plate);
   args=['-loop','1','-framerate',String(FPS),'-i',plate,'-loop','1','-framerate',String(FPS),'-i',layer];
   const animation=overlayFilter(clip);
   videoPipeline=`[0:v]format=yuv420p[base];[1:v]format=rgba${animation.fade}[overlay];[base][overlay]overlay=x=0:y=${animation.y}:shortest=1,format=yuv420p${fadeFilter(clip)}[vout]`;
 }
 const silenceIndex=2; // Base media, transparent overlay, then silence source (both clip types).
 args.push('-f','lavfi','-i','anullsrc=r=44100:cl=stereo');
 let musicIndex=null;
 if(clip.music){const track=trackById.get(clip.music.trackId);if(!track)throw new Error('Audio track unavailable.');musicIndex=silenceIndex+1;const trackFile=await downloadMedia(track.media,workspace);args.push('-ss',String(clip.music.start||0),'-i',trackFile);}
 const info=clip.mediaKind==='video'?await ffprobe(media):null;
 const hasAudio=clip.mediaKind==='video'&&Boolean(info?.streams?.some(x=>x.codec_type==='audio'));
 const filters=videoPipeline+';'+audioFilter({clip,hasAudio,musicIndex,silenceIndex});
 args.push('-filter_complex',filters,'-map','[vout]','-map','[aout]','-t',String(clip.duration),'-r',String(FPS),'-c:v','libx264','-preset',process.env.STORY_RENDER_PRESET||'ultrafast','-crf',String(Number(process.env.STORY_RENDER_CRF||27)),'-threads','1','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-ar','44100','-movflags','+faststart',output);
 await ffmpeg(args, progress);
 return output;
}
async function prepareInputs(job){
 const manifest=job.manifest;const mediaIds=[...new Set(manifest.clips.flatMap(c=>[c.mediaId,...c.layers.filter(l=>l.type==='image').map(l=>l.mediaId)].filter(Boolean)))];
 const tracksIds=[...new Set(manifest.clips.map(c=>c.music?.trackId).filter(Boolean))];
 const [media,tracks]=await Promise.all([
  Media.find({_id:{$in:mediaIds},ownerId:job.ownerId,purpose:'story',status:'ready'}).lean(),
  StoryMusic.find({_id:{$in:tracksIds},$or:[{ownerId:job.ownerId},{visibility:'public'}]}).lean(),
 ]);
 const mediaById=new Map(media.map(m=>[String(m._id),m]));
 const trackById=new Map();
 const trackMedia=await Media.find({_id:{$in:tracks.map(x=>x.mediaId)},status:'ready',purpose:'story_audio'}).lean();
 const trackAsset=new Map(trackMedia.map(x=>[String(x._id),x]));
 for(const track of tracks)if(trackAsset.has(String(track.mediaId)))trackById.set(String(track._id),{...track,media:trackAsset.get(String(track.mediaId))});
 for(const clip of manifest.clips){
  if(clip.mediaId){const m=mediaById.get(clip.mediaId);if(!m || m.kind!==clip.mediaKind)throw new Error('The selected media has been removed or changed.');if(m.kind==='video'&&clip.trimStart+clip.duration*clip.speed>m.duration+0.15)throw new Error('Trim and playback speed exceed the source video duration.');}
  if(clip.music){const track=trackById.get(clip.music.trackId);if(!track || clip.music.start+clip.duration>track.duration+.1)throw new Error('The licensed music segment is not long enough.');}
 }
 return {mediaById,trackById};
}
export async function processRenderJob(job){
 const workspace=path.join(mediaPath('temp','story-renders'),String(job._id));
 await mkdir(workspace,{recursive:true});let uploaded=null,mediaRow=null,publishedStory=null;
 try{
  const alreadyPublished=await SocialStory.findOne({renderJobId:job._id}).lean();
  if(alreadyPublished){
    await StoryRenderJob.updateOne({_id:job._id},{$set:{status:'ready',progress:100,storyId:alreadyPublished._id,outputMediaId:alreadyPublished.mediaId,completedAt:new Date()},$unset:{manifest:''}});
    return;
  }
  const {mediaById,trackById}=await prepareInputs(job);
  const parts=[];const total=durationOf(job.manifest.clips);let elapsed=0;
  for(let i=0;i<job.manifest.clips.length;i++){
   const clip=job.manifest.clips[i];
   const last=elapsed;
   const part=await renderClip({clip,index:i,workspace,mediaById,trackById,progress:seconds=>{const pct=5+Math.min(80,Math.floor((last+Math.min(seconds,clip.duration))/total*80));if(pct>job.progress+3){job.progress=pct;StoryRenderJob.updateOne({_id:job._id},{$set:{progress:pct}}).catch(console.error);}}});
   parts.push(part);elapsed+=clip.duration;
  }
  const list=path.join(workspace,'concat.txt');await writeFile(list,parts.map(p=>`file '${p.replaceAll("'","'\\''")}'`).join('\n'));
  const result=path.join(workspace,'final.mp4');
  await ffmpeg(['-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',result]);
  const probe=await ffprobe(result);const v=probe.streams.find(x=>x.codec_type==='video');
  if(v?.width!==W||v?.height!==H||Math.abs(Number(probe.format.duration)-total)>.35)throw new Error('Rendered video failed dimension or duration verification.');
  const size=(await stat(result)).size;if(!size||size>Number(process.env.STORY_MAX_RENDER_MB||150)*1024*1024)throw new Error('Rendered story exceeds upload size limit.');
  const poster=path.join(workspace,'poster.webp');
  const posterPng=path.join(workspace,'poster.png');
  await ffmpeg(['-ss','0.15','-i',result,'-frames:v','1','-vf','scale=320:-2',posterPng]);
  await sharp(posterPng).webp({quality:70}).toFile(poster);
  const posterBytes=(await stat(poster)).size;
  await StoryRenderJob.updateOne({_id:job._id},{$set:{status:'uploading',progress:90}});
  const hash=createHash('sha256');for await(const bytes of createReadStream(result))hash.update(bytes);
  const checksum=hash.digest('hex');const uuid=randomUUID();
  mediaRow=await Media.create({ownerId:job.ownerId,purpose:'story',kind:'video',status:'processing',mime:'video/mp4',originalMime:'video/mp4',originalName:`aevora-story-${uuid}.mp4`,originalSize:size,optimizedSize:size,size,width:W,height:H,duration:total,checksum,progress:92,storageProvider:storageMode==='imagekit'?'imagekit':'local'});
  let thumbUploaded=null;
  if(storageMode==='imagekit'){
   const key=`${objectPrefix({kind:'video',purpose:'story',ownerId:job.ownerId,entityId:String(mediaRow._id)})}/${uuid}.mp4`;
   uploaded=await putPrivateObject({objectKey:key,filename:result,mime:'video/mp4'});
   mediaRow.objectKey=uploaded.objectKey;mediaRow.storageFileId=uploaded.fileId;
   thumbUploaded=await putPrivateObject({objectKey:`${objectPrefix({kind:'video',purpose:'story',ownerId:job.ownerId,entityId:String(mediaRow._id)})}/${uuid}-thumb.webp`,filename:poster,mime:'image/webp'});
   mediaRow.thumbObjectKey=thumbUploaded.objectKey;mediaRow.thumbStorageFileId=thumbUploaded.fileId;mediaRow.thumbSize=posterBytes;
  }else{
   const key=`${mediaRow._id}.mp4`;const thumb=`${mediaRow._id}.webp`;await ensureMediaFolders();await copyFile(result,mediaPath('processed',key));await copyFile(poster,mediaPath('thumbs',thumb));mediaRow.optimizedKey=key;mediaRow.thumbKey=thumb;mediaRow.thumbSize=posterBytes;
  }
  await mediaRow.save();
  // Publication is atomic from the viewer's perspective: only a ready media ID is ever referenced.
  mediaRow.status='ready';mediaRow.progress=100;mediaRow.completedAt=new Date();await mediaRow.save();
  const story=await SocialStory.findOneAndUpdate({renderJobId:job._id},{$setOnInsert:{ownerId:job.ownerId,renderJobId:job._id,mediaId:mediaRow._id,mediaKind:'video',duration:total,visibility:job.manifest.visibility,effects:{background:'#17172b'},layers:[],groupId:randomUUID(),slideIndex:0,expiresAt:new Date(Date.now()+24*3600_000)}},{upsert:true,new:true,setDefaultsOnInsert:true});
  publishedStory=story;
  await StoryRenderJob.updateOne({_id:job._id},{$set:{status:'ready',progress:100,completedAt:new Date(),storyId:story._id,outputMediaId:story.mediaId},$unset:{manifest:''}});
 }catch(error){
  if(publishedStory){
    console.warn('Story was published but render status update failed:',job._id,error.message);
    return; // A retry/restart will reconcile from renderJobId; never delete published media.
  }
  if(uploaded?.fileId){await deletePrivateObject(uploaded.fileId).catch(console.error);}
  if(mediaRow?.thumbStorageFileId){await deletePrivateObject(mediaRow.thumbStorageFileId).catch(console.error);}
  if(mediaRow){await Media.deleteOne({_id:mediaRow._id}).catch(console.error);}
  await StoryRenderJob.updateOne({_id:job._id},{$set:{status:'failed',error:String(error.message).slice(0,250),completedAt:new Date(),progress:0}});
  console.warn('Story render failed:',job._id,error.message);
 }finally{await rm(workspace,{recursive:true,force:true}).catch(console.error);}
}
let workerStarted=false;
export function startStoryRenderWorker(){
 if(workerStarted)return;workerStarted=true;let running=false;
 const next=async()=>{
  if(running)return;running=true;
  try{
   // Reclaim jobs interrupted by deployment or process termination.
   await StoryRenderJob.updateMany({status:{$in:['rendering','uploading']},updatedAt:{$lt:new Date(Date.now()-5*60_000)},attempts:{$lt:3}},{$set:{status:'pending'}});
   const job=await StoryRenderJob.findOneAndUpdate({status:'pending',attempts:{$lt:3}},{$set:{status:'rendering',startedAt:new Date(),progress:2,error:null},$inc:{attempts:1}},{sort:{createdAt:1},new:true});
   if(job)await processRenderJob(job);
  }catch(error){console.warn('Story render worker:',error.message);}finally{running=false;}
 };
 const timer=setInterval(()=>next().catch(console.error),3500);timer.unref();next().catch(console.error);
}
