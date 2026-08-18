import type {NarrativeState} from '@/lib/director/types';
import {WebcamScriptSchema} from './schemas';

export async function writeWebcamScript(state:NarrativeState){
 if(state.chapter===2){
  const contact=state.chapterTwo.activeContact;
  const performance=contact==='mike_sk8'
   ?{emotionalTone:'nervous_confirmation' as const,performanceNotes:'Begin casually and hold an old labelled disc close to the webcam. Become still when the label appears wrong. Keep the fear restrained and end by reaching toward the camera cable.'}
   :contact==='sarahlou_x'
    ?{emotionalTone:'guarded_relief' as const,performanceNotes:'Narrate a silent recovered clip with careful composure. Look past the webcam only once when the empty chair appears behind you, then end the connection without melodrama.'}
    :{emotionalTone:'confused_confession' as const,performanceNotes:'Speak slowly and point the webcam toward an old computer case. Count the power-light flashes under your breath, recognize the pattern, then deliver the final warning directly to camera.'};
  return WebcamScriptSchema.parse({spokenScript:state.webcam.script,...performance,usedVisitorFacts:[]});
 }
 const route=state.story.route;
 const performance=route==='truth'
  ?{emotionalTone:'guarded_relief' as const,performanceNotes:'Begin guarded and confused. Let the final two sentences land with relief rather than tears; small pauses, steady eye line, no melodrama.'}
  :route==='impersonation'
   ?{emotionalTone:'confused_confession' as const,performanceNotes:'Start hopeful, then become very still as the inconsistency lands. The accusation is quiet and certain, never horror-styled or shouted.'}
   :{emotionalTone:'nervous_confirmation' as const,performanceNotes:'Speak as if silence itself is the threat. Check the chat window between phrases, soften when asking the listener to stay, and end with a deliberate breath.'};
 return WebcamScriptSchema.parse({spokenScript:state.webcam.script,...performance,usedVisitorFacts:[]});
}
