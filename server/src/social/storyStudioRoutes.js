import { Router } from 'express';
import { AppError } from '../utils/AppError.js';
import { Media, StoryMusic, StoryRenderJob } from './models.js';
import { body, wrap } from './routeUtils.js';
import { objectId } from './helpers.js';
import { storyRenderInput, durationOf } from './storyStudioRules.js';

const router=Router();
const idPattern=/^[a-f0-9]{24}$/i;

router.post('/stories/renders',wrap(async(req)=>{
  const input=body(req,storyRenderInput);
  // Do not create a second render if a retry or a double-click used the same request ID.
  const existing=await StoryRenderJob.findOne({ownerId:req.user.id,requestId:input.requestId}).lean();
  if(existing)return { id:String(existing._id),status:existing.status,progress:existing.progress||0 };
  const mediaIds=[...new Set(input.clips.flatMap(c=>[c.mediaId,...c.layers.filter(x=>x.type==='image').map(x=>x.mediaId)].filter(Boolean)))];
  const media=await Media.find({_id:{$in:mediaIds.map(objectId)},ownerId:req.user.id,purpose:'story',status:'ready'}).lean();
  const owned=new Map(media.map(x=>[String(x._id),x]));
  const trackIds=[...new Set(input.clips.map(c=>c.music?.trackId).filter(Boolean))];
  const tracks=await StoryMusic.find({_id:{$in:trackIds.map(objectId)},$or:[{ownerId:req.user.id},{visibility:'public'}]}).lean();
  const permitted=new Map(tracks.map(x=>[String(x._id),x]));
  for(const clip of input.clips){
    if(clip.mediaId){const record=owned.get(clip.mediaId);if(!record||record.kind!==clip.mediaKind)throw new AppError('A clip is not ready or is not owned by this account.',400);if(clip.mediaKind==='video'&&clip.trimStart+clip.duration*clip.speed>Number(record.duration||0)+.15)throw new AppError('Video trim and speed exceed its original length.',400);}
    if(clip.music){const track=permitted.get(clip.music.trackId);if(!track||clip.music.start+clip.duration>track.duration+.1)throw new AppError('Choose an authorized music segment long enough for this clip.',400);}
    for(const layer of clip.layers){
      if(layer.type==='image' && !['image','gif'].includes(owned.get(layer.mediaId)?.kind))throw new AppError('Upload your image sticker first.',400);
      if(!['text','drawing','emoji','image'].includes(layer.type))throw new AppError('This interactive sticker cannot be baked into an MP4. Use Interactive Story to keep it interactive.',400);
    }
  }
  try{
    const job=await StoryRenderJob.create({ownerId:req.user.id,requestId:input.requestId,manifest:input,status:'pending',progress:0});
    return {id:job.id,status:'pending',progress:0,duration:durationOf(input.clips)};
  }catch(error){
    if(error.code===11000){const job=await StoryRenderJob.findOne({ownerId:req.user.id,requestId:input.requestId});return {id:job.id,status:job.status,progress:job.progress||0};}
    throw error;
  }
}));
router.get('/stories/renders/:id',wrap(async(req)=>{
  if(!idPattern.test(req.params.id))throw new AppError('Render job not found.',404);
  const job=await StoryRenderJob.findOne({_id:objectId(req.params.id),ownerId:req.user.id}).lean();
  if(!job)throw new AppError('Render job not found.',404);
  return {id:String(job._id),status:job.status,progress:job.progress||0,error:job.status==='failed'?job.error:null,storyId:job.storyId?String(job.storyId):null,mediaId:job.outputMediaId?String(job.outputMediaId):null};
}));
router.post('/stories/renders/:id/retry',wrap(async(req)=>{
  if(!idPattern.test(req.params.id))throw new AppError('Render job not found.',404);
  const job=await StoryRenderJob.findOneAndUpdate({_id:objectId(req.params.id),ownerId:req.user.id,status:'failed',attempts:{$lt:3}},{$set:{status:'pending',progress:0,error:null}},{new:true});
  if(!job)throw new AppError('Render is not eligible for retry.',409);
  return {id:job.id,status:job.status};
}));
export default router;
