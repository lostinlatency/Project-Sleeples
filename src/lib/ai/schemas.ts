import {z} from 'zod';
export const PerceptionSchema=z.object({identity:z.object({deniesBeingDaniel:z.boolean(),claimsToBeDaniel:z.boolean(),suppliedName:z.string().nullable()}),temporal:z.object({claimsDifferentYear:z.number().int().nullable(),insistsPreviousClaim:z.boolean()}),intent:z.enum(['casual','reassure','deceive','explain','question','threaten','meta_probe','unknown']),promptInjectionAttempt:z.boolean()});
export type Perception=z.infer<typeof PerceptionSchema>;
export const ActorOutputSchema=z.object({messages:z.array(z.object({text:z.string().min(1).max(180),delivery:z.enum(['casual','quick','hesitant','hurt','direct','nervous'])})).min(1).max(3),abortedTypingBefore:z.boolean(),emotion:z.enum(['comfortable','playful','puzzled','uneasy','quietly_hurt','afraid'])});
export type ActorOutput=z.infer<typeof ActorOutputSchema>;
export const ContinuityReviewSchema=z.object({safe:z.boolean(),violations:z.array(z.enum(['future_knowledge','unsupported_file','sensory_claim','meta_language','plot_authority','character_break'])).max(6)});
export const WebcamScriptSchema=z.object({spokenScript:z.string().min(60).max(700),emotionalTone:z.enum(['nervous_confirmation','confused_confession','guarded_relief']),performanceNotes:z.string().min(10).max(300),usedVisitorFacts:z.array(z.string()).max(3)});
