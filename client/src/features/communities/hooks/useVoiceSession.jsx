import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { communityCreate, communityError } from '../api/communityApi';
const VoiceContext=createContext(null);
export function VoiceProvider({children}){
  const [session,setSession]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [expanded,setExpanded]=useState(false);
  const leave=useCallback(()=>{setSession(null);setExpanded(false);setError('');},[]);
  const join=useCallback(async(channelId,{quick=false}={})=>{
    if(busy)return;
    setBusy(true);setError('');
    try{
      const data=await communityCreate(quick?`/voice/quick/${channelId}/token`:`/channels/${channelId}/voice/token`,{});
      setSession({...data,channelId:quick?null:channelId,quickRoomId:quick?channelId:null,key:Date.now()});
      setExpanded(true);
      return true;
    }catch(err){setError(communityError(err));return false;}
    finally{setBusy(false);}
  },[busy]);
  const value=useMemo(()=>({session,busy,error,setError,setSession,expanded,setExpanded,join,leave}),[session,busy,error,expanded,join,leave]);
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
export function useVoiceSession(){const value=useContext(VoiceContext);if(!value)throw new Error('VoiceProvider required');return value;}
