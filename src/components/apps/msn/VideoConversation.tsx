"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { CONTACT_DISPLAY } from "@/content/public/contact-display";
import { CONTACTS } from "@/content/public/contacts";

export function VideoConversation() {
  const {
    webcamStream,
    sound,
    volume,
    view,
    webcamScript,
    webcamPlaying,
    reactorMode,
  } = useNarrative();
  const contactId = view?.activeContact ?? "sleepless_17";
  const contact = CONTACT_DISPLAY[contactId];
  const source = CONTACTS.find((item) => item.id === contactId);
  const avatar =
    (source && "avatar" in source && source.avatar) ||
    "/assets/avatars/sleepless_17.webp";
  const video = useRef<HTMLVideoElement>(null);
  const [caption, setCaption] = useState("");
  const [announced, setAnnounced] = useState("");
  const live = Boolean(webcamStream);

  useEffect(() => {
    return () => {
      webcamStream?.getTracks().forEach((track) => track.stop());
    };
  }, [webcamStream]);

  useEffect(() => {
    if (!webcamScript || (!webcamPlaying && !live)) return;
    const speed = live ? 30 : 14;
    let shown = 0;
    let lastAnnounce = 0;
    const timer = setInterval(() => {
      shown = Math.min(shown + 2, webcamScript.length);
      const slice = webcamScript.slice(0, shown);
      setCaption(slice);
      if (shown - lastAnnounce >= 30 || shown >= webcamScript.length) {
        lastAnnounce = shown;
        setAnnounced(slice);
      }
      if (shown >= webcamScript.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [live, webcamPlaying, webcamScript]);

  useEffect(() => {
    const element = video.current;
    if (!element || !webcamStream) return;
    element.srcObject = webcamStream;
    element.volume = sound ? volume : 0;
    void element.play().catch(() => {});
  }, [sound, volume, webcamStream]);

  return (
    <div className="video-conversation" data-testid="webcam-panel">
      <div className="video-stage" data-contact={contactId}>
        {webcamStream ? (
          <video ref={video} autoPlay playsInline />
        ) : (
          <Image
            src={avatar}
            alt={`Live video from ${contact.name}`}
            fill
            sizes="900px"
            priority
            style={{ objectFit: "cover" }}
          />
        )}
        <div className="webcam-softness" />
        {!webcamStream && contactId === "mike_sk8" ? (
          <div
            className="mock-clue mock-cd"
            aria-label="A handwritten backup CD label changes"
          >
            <span>BRB_backup_2</span>
            <b>EMILY_backup_2</b>
          </div>
        ) : null}
        {!webcamStream && contactId === "sarahlou_x" ? (
          <div
            className="mock-clue mock-chair"
            aria-label="An empty chair briefly appears behind Sarah"
          />
        ) : null}
        {!webcamStream && contactId === "tom_d" ? (
          <div
            className="mock-clue mock-case"
            aria-label="The computer power light answers in a pattern"
          >
            <i />
          </div>
        ) : null}
        {caption ? (
          <div className="video-captions" data-testid="webcam-captions">
            {caption}
            {announced ? (
              <span
                aria-live="polite"
                aria-atomic="true"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                }}
              >
                {announced}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="video-status">
          <span />{" "}
          {webcamStream
            ? "Connected — receiving video"
            : reactorMode === "mock"
              ? "Simulated connection — mock video"
              : "Connecting…"}
        </div>
        <div
          className="local-camera"
          aria-label="Daniel's camera is unavailable"
        >
          <strong>D</strong>
          <small>Camera unavailable</small>
        </div>
      </div>
      <footer className="video-footer">
        <span>{contact.name}</span>
        <small>Video Conversation</small>
      </footer>
    </div>
  );
}
