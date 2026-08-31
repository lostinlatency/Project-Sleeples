"use client";

import { useNarrative } from "@/components/system/NarrativeProvider";

export function PinballTable() {
  const { view } = useNarrative();
  const views = view?.pinballViews ?? 0;
  const visitorScore = views >= 2 ? 118_000 + (views - 2) * 42_000 : null;
  const danielScore = 2_240_000 + (views >= 3 ? 1 : 0);
  const rows: Array<{ name: string; score: string; date: string; you?: boolean }> = [
    { name: "Daniel", score: danielScore.toLocaleString("en-US"), date: "10/18/2005 2:24 AM" },
    { name: "sleepless_17", score: "1,204,750", date: "10/18/2005 2:19 AM" },
    { name: "tom_d", score: "912,300", date: "10/17/2005 11:02 PM" },
    { name: "mike_sk8", score: "640,110", date: "10/12/2005 9:47 PM" },
    ...(visitorScore !== null
      ? [
          {
            name: "visitor",
            score: visitorScore.toLocaleString("en-US"),
            date: "10/18/2005 2:2? AM",
            you: true,
          },
        ]
      : []),
  ];
  return (
    <div className="pinball-window" data-testid="pinball-table">
      <div className="pinball-error" role="alert">
        Direct3D initialization error. Running in low memory mode.
      </div>
      <div className="pinball-table-head">
        <b>High scores — Space Cadet</b>
        <small>
          {views >= 3
            ? "1st place score is drifting"
            : views === 2
              ? "A new entry appeared"
              : "Last played: 10/18/2005"}
        </small>
      </div>
      <ol className="pinball-rows">
        {rows.map((row, index) => (
          <li key={row.name} className={row.you ? "you" : undefined}>
            <span className="rank">{index + 1}.</span>
            <span className="name">{row.name}</span>
            <span className="score">{row.score}</span>
            <span className="date">{row.date}</span>
          </li>
        ))}
      </ol>
      <div className="pinball-foot">
        <span>Play is unavailable until Direct3D is repaired.</span>
      </div>
    </div>
  );
}
