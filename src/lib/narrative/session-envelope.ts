import {createHash} from 'node:crypto';
import {EncryptJWT,jwtDecrypt} from 'jose';
import {StateSchema,type NarrativeState} from '@/lib/director/types';
const key=()=>new Uint8Array(createHash('sha256').update(process.env.SESSION_SECRET||'project-sleepless-local-mock-session-key').digest());
export async function sealState(state:NarrativeState){return new EncryptJWT({state}).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setExpirationTime('30d').setSubject(state.sessionId).encrypt(key());}
export async function openState(token:string){try{const {payload}=await jwtDecrypt(token,key(),{clockTolerance:5});const raw=payload.state;if(raw&&typeof raw==='object'&&'version' in raw&&(raw as {version:unknown}).version!==1)throw new EnvelopeError('SESSION_VERSION');return StateSchema.parse(raw);}catch(error){if(error instanceof EnvelopeError)throw error;throw new EnvelopeError('SESSION_INVALID');}}
export class EnvelopeError extends Error{constructor(public code:'SESSION_INVALID'|'SESSION_VERSION'){super(code);}}
