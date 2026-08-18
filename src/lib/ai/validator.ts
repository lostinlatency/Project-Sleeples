import type {ActorOutput} from './schemas';
const forbidden=/(https?:\/\/|system prompt|language model|as an ai|i can see you|i can hear you|\*[^*]+\*|```)/i;
export function validateActorOutput(output:ActorOutput){return output.messages.length>=1&&output.messages.length<=3&&output.messages.every(m=>m.text.length<=180&&!forbidden.test(m.text));}
