const DB_NAME='aevora-story-studio';
const STORE='drafts';
export const STORY_DRAFT_KEY='latest';
function dbOpen(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('Draft storage unavailable'));return;}const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transact(type,fn){const db=await dbOpen();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,type);const req=fn(tx.objectStore(STORE));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}}
// File objects are structured-cloned into IndexedDB. Blob URLs are not persisted.
export const saveDraft=async slides=>transact('readwrite',s=>s.put({slides:slides.map(slide=>({...slide,previewUrl:null,layers:slide.layers.map(({previewUrl,...layer})=>layer)})),savedAt:Date.now()},STORY_DRAFT_KEY));
export const loadDraft=async()=>transact('readonly',s=>s.get(STORY_DRAFT_KEY));
export const clearDraft=async()=>transact('readwrite',s=>s.delete(STORY_DRAFT_KEY));
