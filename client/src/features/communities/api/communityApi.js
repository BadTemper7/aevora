import { api } from '../../../services/api/axios';
// Community endpoints reuse Better Auth session cookies and AEVORA's existing response envelope.
export const communityRead=async(path,params)=> (await api.get(path,{params})).data.data;
export const communityCreate=async(path,body)=> (await api.post(path,body)).data.data;
export const communityPatch=async(path,body)=> (await api.patch(path,body)).data.data;
export const communityPut=async(path,body)=> (await api.put(path,body)).data.data;
export const communityDelete=async(path,body)=> (await api.delete(path,{data:body})).data.data;
export const communityError=(error)=> error?.response?.data?.error?.message || error?.message || 'The request failed. Please try again.';
export const communityFile=(id,thumb=false)=> id?`/api/social/media/${encodeURIComponent(id)}/file${thumb?'?thumb=1':''}`:null;
