import type {NarrativeState} from '@/lib/director/types';
export function resolveThread(state:NarrativeState,id:string){return {...state,openThreads:state.openThreads.map(t=>t.id===id?{...t,resolved:true}:t)};}
