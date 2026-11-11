import test from 'node:test';
import assert from 'node:assert/strict';
import { durationTotal, availableTime, canSetDuration, splitClip, duplicateClip, moveClip, clipAtTime } from '../src/features/social/feed/stories/storyTimeline.js';
const clip=(id,duration=10)=>({id,duration,mediaKind:'video',speed:1.5,transition:'fade',effects:{trimStart:2},layers:[{id:'t',type:'text'}],music:{start:4}});
test('total timeline limit exactly 60 seconds',()=>{const values=Array.from({length:10},(_,i)=>clip(String(i),6));assert.equal(durationTotal(values),60);assert.equal(availableTime(values),0);assert.equal(canSetDuration(values,0,6.1),false);assert.equal(canSetDuration(values,0,6),true);});
test('splitting changes source trim and advances soundtrack',()=>{const parts=splitClip([clip('x')],0,4,'y');assert.equal(parts.length,2);assert.equal(parts[0].duration,4);assert.equal(parts[1].duration,6);assert.equal(parts[1].effects.trimStart,8);assert.equal(parts[1].music.start,8);assert.equal(parts[1].transition,'cut');assert.notEqual(parts[0].layers[0].id,parts[1].layers[0].id);});
test('splitting rejects too-short sections and preserves original',()=>{const items=[clip('a',.8)];assert.equal(splitClip(items,0,.4,'z'),items);});
test('duplicate respects count and duration limits',()=>{const full=[clip('a',35),clip('b',25)];assert.equal(duplicateClip(full,0,'c'),full);const updated=duplicateClip([clip('a',5)],0,'b');assert.equal(updated.length,2);assert.equal(durationTotal(updated),10);});
test('reorder preserves duration, seek gets local time',()=>{const clips=[clip('a',5),clip('b',10)];const changed=moveClip(clips,0,1);assert.equal(changed[0].id,'b');assert.equal(durationTotal(changed),15);assert.deepEqual(clipAtTime(changed,12),{index:1,local:2,start:10});});
