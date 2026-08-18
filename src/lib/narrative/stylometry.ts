export const DANIEL_HISTORY=[
 'hey em','sorry net died','haha yeah','mum needed the phone','u still awake','knew u would be','that song again :P','send it again','nm found it','its actually good','dont tell mike i said that','brb tea','back','u finished the homework','same haha','ill do it tomorrow','sleepy u there','sorry was packing','nothing important','we might move','not sure yet','mum keeps talking about it','ill tell u when i know','promise','did u see the beach pics','the blurry one','haha thats ur fault','em stop','ok maybe its funny','i have to tell u something','nm','tomorrow','ur not mad right','good','i should sleep','night sleepy :P',
] as const;
function deriveProfile(history:readonly string[]){
 const words=history.flatMap(m=>m.split(/\s+/));const laughs=words.filter(w=>/^(haha|lol)$/i.test(w));
 return {capitalization:history.every(m=>!/[A-Z]/.test(m.replaceAll(':P',''))) ? 'lowercase':'mixed',preferredLaugh:laughs.filter(w=>w.toLowerCase()==='haha').length>=laughs.length/2?'haha':'lol',avoids:['lol','bro','dude'],emoticons:[':P'],averageFragmentWords:Math.round(words.length/history.length),commonNamesForEmily:['em','sleepy'],sendsMultipleFragments:true,punctuation:'minimal'} as const;
}
export const DANIEL_STYLE=deriveProfile(DANIEL_HISTORY);
export function compareDanielStyle(messages:string[]){const text=messages.join(' ');const evidence:string[]=[];if(/\blol\b/i.test(text))evidence.push('Daniel never used lol; he used haha.');if(/\b(?:bro|dude)\b/i.test(text))evidence.push('Daniel never called Emily bro or dude.');if(/[.!?]{2,}/.test(text)||/[A-Z]{6,}/.test(text))evidence.push('Daniel wrote in short, quiet lowercase fragments.');return evidence;}
