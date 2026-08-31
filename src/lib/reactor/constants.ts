export const MODEL_NAME='reactor/ltx2' as const;
export const FIXED_CHARACTER_SEED=17102005;
export const CHARACTER_WPM=132;
export const FIXED_PERFORMANCE_PROMPT='A nineteen-year-old sits close to a cheap desktop webcam and speaks directly toward the monitor. Ordinary low-resolution home-webcam behavior, restrained natural motion, occasional downward glances at the chat window, subtle hand fidgeting, small uncertain pauses, no dramatic gestures, no horror performance, no facial distortion, no camera movement, stable bedroom background and framing.';

const CHARACTER_DIRECTION: Record<string, string> = {
  sleepless_17:
    "Emily is a nineteen-year-old woman in a dim bedroom, wary but emotionally present.",
  mike_sk8:
    "Mike is a nineteen-year-old man at a cluttered desk, trying to sound practical while visibly unsettled.",
  sarahlou_x:
    "Sarah is a nineteen-year-old woman in a quiet bedroom, guarded and composed with restrained concern.",
  tom_d:
    "Tom is a young man beside an old computer, controlled and direct, with tension held in his posture.",
};

export function performancePromptFor(
  contactId: string,
  performanceNotes: string,
) {
  return `${CHARACTER_DIRECTION[contactId] ?? CHARACTER_DIRECTION.sleepless_17} Cheap 2005 home webcam, fixed framing, low resolution, realistic compression and exposure breathing. Natural blinking, breathing, eye movement, and restrained gestures. The speaker looks between the chat window and webcam while speaking. ${performanceNotes} No horror acting, no facial distortion, no camera movement, no subtitles or text inside the generated video.`;
}
