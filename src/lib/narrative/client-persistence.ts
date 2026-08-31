'use client';
import type { DeliveredMessage, PublicView } from '@/lib/director/types';
export interface SavedSession{envelope:string;publicView:unknown;messages:unknown[]}
const KEY='sleepless.recovered.v1';
export function isCurrentSavedSession(value:SavedSession|null):value is SavedSession&{publicView:{storyNodeId:string;storyRoute:string;choices:unknown[]}}{
 if(!value||typeof value.envelope!=='string'||!Array.isArray(value.messages))return false;
 const view=value.publicView;
 return Boolean(view&&typeof view==='object'&&typeof (view as Record<string,unknown>).storyNodeId==='string'&&typeof (view as Record<string,unknown>).storyRoute==='string'&&Array.isArray((view as Record<string,unknown>).choices));
}
export function normalizeSavedPublicView(view:unknown):PublicView{
 const value=view as PublicView;
 const gameDefaults={flagsStatus:(value.flagsStatus??'hidden') as PublicView['flagsStatus'],flagsOutcome:(value.flagsOutcome??'pending') as PublicView['flagsOutcome'],flagsRound:value.flagsRound??0,typingTestStatus:(value.typingTestStatus??'hidden') as PublicView['typingTestStatus'],pinballViews:value.pinballViews??0};
 const reactiveDefaults={reactiveStage:value.reactiveStage??0,recycleArtifact:value.recycleArtifact??'hidden',memoryDecision:value.memoryDecision??'pending',movingNoteMutated:value.movingNoteMutated??false,recoveredVideoAvailable:value.recoveredVideoAvailable??false,recoveredVideoCompleted:value.recoveredVideoCompleted??false,possessionMode:value.possessionMode??'idle',resistShutdown:value.resistShutdown??false,emilyAvatarVariant:value.emilyAvatarVariant??'normal'} as const;
 if(value.chapter)return {...value,emilySuspicion:value.emilySuspicion??0,...gameDefaults,...reactiveDefaults};
 return {...value,chapter:1,activeContact:'sleepless_17',chapterTwoStage:'locked',contactStatuses:{sleepless_17:value.online?'online':'offline',mike_sk8:'offline',sarahlou_x:'offline',tom_d:'offline'},fileTransferDecision:'pending',exposureStage:0,knownEvidence:[],completedContacts:[],finalDecision:null,fileOfferDescription:'',emilySuspicion:0,...gameDefaults,...reactiveDefaults};
}
export function normalizeSavedMessages(messages:unknown[]):DeliveredMessage[]{
 return messages.map(item=>{const message=item as DeliveredMessage;return {...message,contactId:message.contactId??'sleepless_17'};});
}
export async function saveSession(value:SavedSession){try{const db=await openDb();const tx=db.transaction('session','readwrite');tx.objectStore('session').put(value,KEY);await done(tx);}catch{localStorage.setItem(KEY,JSON.stringify(value));}}
export async function loadSession():Promise<SavedSession|null>{try{const db=await openDb();const tx=db.transaction('session','readonly');const value=await request(tx.objectStore('session').get(KEY));return (value as SavedSession)||fallback();}catch{return fallback();}}
export async function clearSession(){try{const db=await openDb();const tx=db.transaction('session','readwrite');tx.objectStore('session').delete(KEY);await done(tx);}catch{}localStorage.removeItem(KEY);}
function fallback(){try{return JSON.parse(localStorage.getItem(KEY)||'null') as SavedSession|null}catch{return null}}
function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('project-sleepless',1);r.onupgradeneeded=()=>r.result.createObjectStore('session');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function request(r:IDBRequest){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function done(t:IDBTransaction){return new Promise<void>((resolve,reject)=>{t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
