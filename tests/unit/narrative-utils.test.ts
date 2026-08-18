import {describe,it,expect} from 'vitest';
import {compareDanielStyle,DANIEL_HISTORY,DANIEL_STYLE} from '@/lib/narrative/stylometry';
import {typingDuration} from '@/lib/timing/delivery';
import {deterministicPerception} from '@/lib/ai/perception';
import {validateActorOutput} from '@/lib/ai/validator';
import {ActorOutputSchema} from '@/lib/ai/schemas';
describe('narrative utilities',()=>{
 it('derives evidence rather than inventing it',()=>{expect(compareDanielStyle(['lol dude'])).toEqual(['Daniel never used lol; he used haha.','Daniel never called Emily bro or dude.']);expect(compareDanielStyle(['haha em'])).toEqual([])});
 it('derives the stable fingerprint from a full authored corpus',()=>{expect(DANIEL_HISTORY.length).toBeGreaterThanOrEqual(30);expect(DANIEL_HISTORY.length).toBeLessThanOrEqual(40);expect(DANIEL_STYLE.preferredLaugh).toBe('haha');expect(DANIEL_STYLE.capitalization).toBe('lowercase')});
 it('calculates deterministic bounded timing',()=>{const value=typingDuration('hello','casual',3);expect(value).toBe(typingDuration('hello','casual',3));expect(value).toBeGreaterThanOrEqual(850);expect(value).toBeLessThanOrEqual(4800);expect(typingDuration('x'.repeat(500),'hesitant',3)).toBe(4800)});
 it('extracts conservative identity and year claims',()=>{const p=deterministicPerception(['My name is June. I am not Daniel. It is 2026.'],null);expect(p.identity).toMatchObject({deniesBeingDaniel:true,suppliedName:'june'});expect(p.temporal.claimsDifferentYear).toBe(2026)});
 it('rejects unsafe Actor claims',()=>{const good=ActorOutputSchema.parse({messages:[{text:'where have u been?',delivery:'casual'}],abortedTypingBefore:false,emotion:'puzzled'});expect(validateActorOutput(good)).toBe(true);expect(validateActorOutput({...good,messages:[{text:'as an AI I can see you',delivery:'direct'}]})).toBe(false)});
});
