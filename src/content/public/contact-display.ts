import type { ContactId } from "@/lib/director/types";

export const CONTACT_DISPLAY: Record<
  ContactId,
  { name: string; line: string; initial: string }
> = {
  sleepless_17: { name: "sleepless_17", line: "awake again", initial: "E" },
  mike_sk8: { name: "mike_sk8", line: "dont close msn", initial: "M" },
  sarahlou_x: {
    name: "sarahlou_x",
    line: "remember this for me",
    initial: "S",
  },
  tom_d: { name: "tom_d", line: "last person online", initial: "T" },
};
