export type Delivery='casual'|'quick'|'hesitant'|'hurt'|'direct'|'nervous';
export function seededJitter(seed:number){const x=Math.sin(seed*999)*10000;return (x-Math.floor(x)-.5)*400;}
export function typingDuration(text:string,delivery:Delivery,seed=1){const mult={quick:.72,casual:1,hesitant:1.35,hurt:1.25,direct:.82,nervous:1.18}[delivery];return Math.round(Math.min(4800,Math.max(850,(650+text.length*38)*mult+seededJitter(seed))));}
