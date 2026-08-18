"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";

export function VideoConversation() {
  const { webcamStream, sound, volume } = useNarrative();
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element || !webcamStream) return;
    element.srcObject = webcamStream;
    element.volume = sound ? volume : 0;
    void element.play().catch(() => {});
  }, [sound, volume, webcamStream]);

  return (
    <div className="video-conversation" data-testid="webcam-panel">
      <div className="video-stage">
        {webcamStream ? (
          <video ref={video} autoPlay playsInline />
        ) : (
          <Image
            src="/assets/avatars/sleepless_17.webp"
            alt="Live video from sleepless_17"
            fill
            sizes="900px"
            priority
            style={{ objectFit: "cover" }}
          />
        )}
        <div className="webcam-softness" />
        <div className="video-status">
          <span /> Connected — receiving video
        </div>
        <div className="local-camera" aria-label="Daniel's camera is unavailable">
          <strong>D</strong>
          <small>Camera unavailable</small>
        </div>
      </div>
      <footer className="video-footer">
        <span>sleepless_17</span>
        <small>Video Conversation</small>
      </footer>
    </div>
  );
}
