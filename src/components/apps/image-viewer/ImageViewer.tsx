"use client";
import Image from "next/image";
export function ImageViewer({ payload }: { payload?: Record<string, string> }) {
  return (
    <div className="image-viewer">
      <div className="viewer-stage">
        {payload?.assetUrl ? (
          <Image
            src={payload.assetUrl}
            alt="Recovered photograph"
            fill
            sizes="640px"
            style={{ objectFit: "contain" }}
          />
        ) : (
          <p>This picture is unavailable.</p>
        )}
      </div>
      {payload?.caption || payload?.meta ? (
        <div className="viewer-caption" data-testid="viewer-caption">
          {payload?.caption ? <p>{payload.caption}</p> : null}
          {payload?.meta ? <small>{payload.meta}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
