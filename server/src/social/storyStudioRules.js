import { z } from 'zod';
import { storyEffects, storyLayer, storyMusicSettings, storyVisibility } from './storyRules.js';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const STORY_MAX_DURATION = 60;
export const STORY_MAX_CLIPS = 10;

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const clipSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  mediaId: objectId.nullable(),
  mediaKind: z.enum(['image','gif','video','text']),
  duration: z.number().finite().min(0.5).max(60),
  speed: z.number().finite().min(0.5).max(2).default(1),
  trimStart: z.number().finite().min(0).max(3600).default(0),
  transition: z.enum(['cut','fade']).default('cut'),
  effectPreset: z.enum(['none','cinematic','blur','glow','monochrome']).default('none'),
  overlayAnimation: z.enum(['none','fade','rise']).default('none'),
  effects: storyEffects.default({}),
  layers: z.array(storyLayer).max(24).default([]),
  music: storyMusicSettings.nullable().default(null),
}).strict().superRefine((clip, ctx) => {
  if (clip.mediaKind !== 'text' && !clip.mediaId) ctx.addIssue({ code:'custom', path:['mediaId'], message:'Upload a media file before rendering.' });
  if (clip.mediaKind === 'text' && clip.mediaId) ctx.addIssue({ code:'custom', path:['mediaId'], message:'Text clips must not have an attached background file.' });
  if (clip.mediaKind === 'video' && clip.trimStart < 0) ctx.addIssue({ code:'custom', path:['trimStart'], message:'Invalid trim start.' });
  if (new Set(clip.layers.map(x=>x.id)).size !== clip.layers.length) ctx.addIssue({ code:'custom', path:['layers'], message:'Duplicate overlay IDs.' });
});
export const storyRenderInput = z.object({
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  visibility: storyVisibility.default('public'),
  clips: z.array(clipSchema).min(1).max(STORY_MAX_CLIPS),
}).strict().superRefine((input, ctx) => {
  const duration = input.clips.reduce((sum,c) => sum+c.duration,0);
  if (duration > STORY_MAX_DURATION + 0.0001) ctx.addIssue({ code:'custom', path:['clips'],message:'Total story timeline must not exceed 60 seconds.' });
  if (new Set(input.clips.map(x=>x.id)).size !== input.clips.length) ctx.addIssue({ code:'custom', path:['clips'],message:'Duplicate clip IDs.' });
});
export const durationOf = clips => clips.reduce((sum, clip) => sum + clip.duration, 0);
