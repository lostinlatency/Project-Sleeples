import {describe,it,expect} from 'vitest';
import {compareDanielStyle,DANIEL_HISTORY,DANIEL_STYLE} from '@/lib/narrative/stylometry';
import {typingDuration} from '@/lib/timing/delivery';
describe('narrative utilities',()=>{
 it('derives evidence rather than inventing it',()=>{expect(compareDanielStyle(['lol dude'])).toEqual(['Daniel never used lol; he used haha.','Daniel never called Emily bro or dude.']);expect(compareDanielStyle(['haha em'])).toEqual([])});
 it('derives the stable fingerprint from a full authored corpus',()=>{expect(DANIEL_HISTORY.length).toBeGreaterThanOrEqual(30);expect(DANIEL_HISTORY.length).toBeLessThanOrEqual(40);expect(DANIEL_STYLE.preferredLaugh).toBe('haha');expect(DANIEL_STYLE.capitalization).toBe('lowercase')});
 it('calculates deterministic bounded timing',()=>{const value=typingDuration('hello','casual',3);expect(value).toBe(typingDuration('hello','casual',3));expect(value).toBeGreaterThanOrEqual(850);expect(value).toBeLessThanOrEqual(4800);expect(typingDuration('x'.repeat(500),'hesitant',3)).toBe(4800)});
});
