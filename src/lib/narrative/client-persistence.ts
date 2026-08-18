'use client';
export interface SavedSession{envelope:string;publicView:unknown;messages:unknown[]}
const KEY='sleepless.recovered.v1';
export function isCurrentSavedSession(value:SavedSession|null):value is SavedSession&{publicView:{storyNodeId:string;storyRoute:string;choices:unknown[]}}{
 if(!value||typeof value.envelope!=='string'||!Array.isArray(value.messages))return false;
 const view=value.publicView;
 return Boolean(view&&typeof view==='object'&&typeof (view as Record<string,unknown>).storyNodeId==='string'&&typeof (view as Record<string,unknown>).storyRoute==='string'&&Array.isArray((view as Record<string,unknown>).choices));
}
export async function saveSession(value:SavedSession){try{const db=await openDb();const tx=db.transaction('session','readwrite');tx.objectStore('session').put(value,KEY);await done(tx);}catch{localStorage.setItem(KEY,JSON.stringify(value));}}
export async function loadSession():Promise<SavedSession|null>{try{const db=await openDb();const tx=db.transaction('session','readonly');const value=await request(tx.objectStore('session').get(KEY));return (value as SavedSession)||fallback();}catch{return fallback();}}
export async function clearSession(){try{const db=await openDb();const tx=db.transaction('session','readwrite');tx.objectStore('session').delete(KEY);await done(tx);}catch{}localStorage.removeItem(KEY);}
function fallback(){try{return JSON.parse(localStorage.getItem(KEY)||'null') as SavedSession|null}catch{return null}}
function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('project-sleepless',1);r.onupgradeneeded=()=>r.result.createObjectStore('session');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function request(r:IDBRequest){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function done(t:IDBTransaction){return new Promise<void>((resolve,reject)=>{t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
