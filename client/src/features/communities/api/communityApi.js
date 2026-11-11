import { api } from '../../../services/api/axios';
// Community endpoints reuse Better Auth session cookies and AEVORA's existing response envelope.
export const communityRead=async(path,params)=> (await api.get(path,{params})).data.data;
export const communityCreate=async(path,body)=> (await api.post(path,body)).data.data;
export const communityPatch=async(path,body)=> (await api.patch(path,body)).data.data;
export const communityPut=async(path,body)=> (await api.put(path,body)).data.data;
export const communityDelete=async(path,body)=> (await api.delete(path,{data:body})).data.data;
export const communityError=(error)=> error?.response?.data?.error?.message || error?.message || 'The request failed. Please try again.';
// Invitation tokens only travel to our own media endpoint. Existing callers
// remain unchanged; the token grants access to invite-only branding images.
export const communityFile = (id, thumb = false, inviteToken = "") => {
  if (!id) return null;
  const params = new URLSearchParams();
  if (thumb) params.set("thumb", "1");
  if (inviteToken) params.set("invite", inviteToken);
  const query = params.toString();
  return `/api/social/media/${encodeURIComponent(id)}/file${query ? `?${query}` : ""}`;
};
