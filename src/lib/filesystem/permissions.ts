import type {NarrativeState} from '@/lib/director/types';
import {FILES} from './manifest';
export function canOpen(state:NarrativeState,fileId:string){const file=FILES.find(f=>f.id===fileId);return !!file&&(file.initiallyVisible||state.unlockedFiles.includes(fileId)||(fileId==='webcam_still'&&state.routeFlags.webcamDeclines>0));}
