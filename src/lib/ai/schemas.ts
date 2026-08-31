import {z} from 'zod';
export const WebcamScriptSchema=z.object({spokenScript:z.string().min(60).max(700),emotionalTone:z.enum(['nervous_confirmation','confused_confession','guarded_relief']),performanceNotes:z.string().min(10).max(300),usedVisitorFacts:z.array(z.string()).max(3)});
