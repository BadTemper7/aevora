import { useEffect, useRef, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants, useRoomContext, useTracks } from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { VideoTrack } from '@livekit/components-react';
import { Camera, CameraOff, ChevronDown, Headphones, HeadphoneOff, Maximize2, Mic, MicOff, MonitorUp, MonitorOff, PhoneOff, Settings2 } from 'lucide-react';
import { useVoiceSession } from '../hooks/useVoiceSession';
const ctl='inline-flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:bg-raised disabled:opacity-50';
function VoiceInside({session}){
  const {leave,setExpanded,expanded,error,setError}=useVoiceSession();
  const room=useRoomContext();
  const participants=useParticipants();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled,isScreenShareEnabled}=useLocalParticipant();
  const tracks=useTracks([Track.Source.Camera,Track.Source.ScreenShare],{onlySubscribed:false});
  const [deaf,setDeaf]=useState(false);
  const audioOutputRef=useRef(null);
  const [selectedDevice,setSelectedDevice]=useState('');
  const [inputDevices,setInputDevices]=useState([]);
  const [deviceOpen,setDeviceOpen]=useState(false);
  const [focus,setFocus]=useState('');
  const [busy,setBusy]=useState('');
  const change=async(label,fn)=>{setBusy(label);setError('');try{await fn();}catch(err){setError(err.message||'Device permission was denied.');}finally{setBusy('');}};
  const activeTracks=focus?tracks.filter(t=>t.participant?.identity===focus):tracks;
  const shownTracks=activeTracks.length?activeTracks:tracks;
  const shareSupported=Boolean(navigator.mediaDevices?.getDisplayMedia);
  const audioDevices=async()=>{
    if(!navigator.mediaDevices?.enumerateDevices)return;
    try{setInputDevices((await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput'));setDeviceOpen(v=>!v);}catch(err){setError(err.message);}
  };
  const toggleMuteOutput=()=>{
    // Mute actual HTML audio elements, without changing microphone capture.
    const next=!deaf;
    audioOutputRef.current?.querySelectorAll('audio').forEach(el=>{el.muted=next;});
    setDeaf(next);
  };
  useEffect(()=>{audioOutputRef.current?.querySelectorAll('audio').forEach(el=>{el.muted=deaf;});},[deaf,participants.length]);
  const toggleScreen=()=>change('screen',()=>localParticipant.setScreenShareEnabled(!isScreenShareEnabled,{audio:true}));
  useEffect(()=>{
    const onEnd=()=>{
      if(room.state===ConnectionState.Disconnected){setError('Disconnected from the voice room.');}
    };
    room.on('disconnected',onEnd);
    return ()=>room.off('disconnected',onEnd);
  },[room,setError]);
  return <div className="flex flex-col gap-3">
    <div ref={audioOutputRef} aria-hidden="true"><RoomAudioRenderer /></div>
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
      <div className="min-w-0"><p className="text-sm font-bold text-ink">{session.quickRoomId?'Private friend voice room':'Voice session connected'}</p><p className="text-xs text-ink-soft">{participants.length} connected · Audio {deaf?'disabled':'enabled'} · {room.state}</p></div>
      <button type="button" className={ctl} onClick={()=>setExpanded(v=>!v)} title={expanded?'Minimize voice':'Expand voice'}>{expanded?<ChevronDown size={17}/>:<Maximize2 size={17}/>}</button>
    </div>
    {expanded && <div className="max-h-[min(52vh,550px)] overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-ink">Voice participants</h3><span className="text-xs text-ink-soft">Select a tile to focus</span></div>
      {shownTracks.length>0 ? <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{shownTracks.map(t=><button type="button" key={`${t.participant.identity}:${t.publication?.trackSid}`} onClick={()=>setFocus(v=>v===t.participant.identity?'':t.participant.identity)} className="relative aspect-video overflow-hidden rounded-xl bg-black text-white"><VideoTrack trackRef={t}/><span className="absolute bottom-1 left-2 rounded bg-black/70 px-2 py-0.5 text-xs">{t.participant.name||'Participant'} · {t.source===Track.Source.ScreenShare?'Screen':'Camera'}</span></button>)}</div> : <p className="mb-3 rounded-xl bg-raised p-3 text-sm text-ink-soft">No video or screen shares are active. Voice is available below.</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{participants.map(p=><div key={p.identity} className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${p.isSpeaking?'border-success bg-success/5':'border-line bg-surface'}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold">{(p.name||'U').slice(0,1)}</span><span className="min-w-0 flex-1 truncate">{p.name||'Member'}</span>{!p.isMicrophoneEnabled&&<MicOff size={14}/>}</div>)}</div>
    </div>}
    {error&&<p role="alert" className="mx-3 text-xs text-danger">{error}</p>}
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line p-2" aria-label="Voice session controls">
      <button type="button" disabled={!session.permissions?.canSpeak && !session.quickRoomId || !!busy} title={isMicrophoneEnabled?'Mute microphone':'Unmute microphone'} className={ctl} onClick={()=>change('mic',()=>localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>{isMicrophoneEnabled?<Mic size={18}/>:<MicOff size={18}/>}</button>
      <button type="button" title={deaf?'Enable speaker':'Deafen'} className={ctl} onClick={toggleMuteOutput}>{deaf?<HeadphoneOff size={18}/>:<Headphones size={18}/>}</button>
      <button type="button" disabled={!session.permissions?.canCamera && !session.quickRoomId || !!busy} title={isCameraEnabled?'Turn off camera':'Enable camera'} className={ctl} onClick={()=>change('camera',()=>localParticipant.setCameraEnabled(!isCameraEnabled))}>{isCameraEnabled?<Camera size={18}/>:<CameraOff size={18}/>}</button>
      <button type="button" disabled={!shareSupported||(!session.permissions?.canShare && !session.quickRoomId)||!!busy} title={!shareSupported?'Screen share is unavailable on this device':isScreenShareEnabled?'Stop screen share':'Share screen'} className={ctl} onClick={toggleScreen}>{isScreenShareEnabled?<MonitorOff size={18}/>:<MonitorUp size={18}/>}</button>
      <button type="button" title="Audio input settings" className={ctl} onClick={audioDevices}><Settings2 size={17}/></button>
      <button type="button" title="Disconnect from voice" className={`${ctl} !border-danger/40 !text-danger`} onClick={leave}><PhoneOff size={19}/></button>
    </div>
    {deviceOpen&&<div className="space-y-2 border-t border-line p-3"><label className="block text-xs font-bold text-ink">Microphone input<select className="mt-1 w-full rounded-lg border border-line bg-surface p-2 text-sm" value={selectedDevice} onChange={e=>{setSelectedDevice(e.target.value);change('device',()=>room.switchActiveDevice('audioinput',e.target.value));}}><option value="">System default</option>{inputDevices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||'Microphone'}</option>)}</select></label><p className="text-xs text-ink-soft">The browser controls which screens and windows can be shared. System audio depends on browser support.</p></div>}
  </div>;
}
export default function VoiceDock(){
  const {session,leave,setSession,expanded,setError,error}=useVoiceSession();
  if(!session)return null;
  return <aside className={`fixed z-[60] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl ${expanded?'inset-x-3 bottom-3 mx-auto max-w-[1000px]':'bottom-3 right-3 w-[min(390px,calc(100vw-1.5rem))]'}`} aria-label="Active voice session">
    <LiveKitRoom key={session.key} token={session.token} serverUrl={session.serverUrl} connect={true} audio={false} video={false} onError={err=>setError(err.message)} onDisconnected={()=>setSession(old=>old?.key===session.key?null:old)}>
      <VoiceInside session={session}/>
    </LiveKitRoom>
  </aside>;
}
