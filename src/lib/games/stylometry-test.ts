export interface TypingScore {
  score: number;
  tells: string[];
  passes: string[];
}

export function scoreTypingAttempt(text: string): TypingScore {
  const trimmed = text.trim();
  const tells: string[] = [];
  const passes: string[] = [];
  if (/\blol\b/i.test(trimmed))
    tells.push("lol");
  if (/\b(?:bro|dude)\b/i.test(trimmed))
    tells.push("bro/dude");
  if (/[.!?]\s*$/.test(trimmed))
    tells.push("full stop");
  if (/[A-Z]/.test(trimmed.replace(/:P/g, "")))
    tells.push("capitals");
  if (trimmed.split(/\s+/).length > 25)
    tells.push("essay");
  if (/haha/i.test(trimmed))
    passes.push("haha");
  if (/:\s*P\b/.test(trimmed))
    passes.push(":P");
  if (/\b(?:em|sleepy)\b/i.test(trimmed))
    passes.push("what he called her");
  if (!tells.length && trimmed.split(/\s+/).length <= 8)
    passes.push("short fragments");
  const score = Math.max(-12, Math.min(12, passes.length * 3 - tells.length * 4));
  return { score, tells, passes };
}

export function typingTestReaction(score: number): string {
  if (score >= 6)
    return "ok. that was him. thats exactly how he types";
  if (score >= 3)
    return "close. he wouldve said it shorter";
  if (score >= 0)
    return "mm. he typed like he was in a hurry. u type like ur being graded";
  if (score >= -5)
    return "no. thats not how he types at all";
  return "stop. dont do his voice again";
}
