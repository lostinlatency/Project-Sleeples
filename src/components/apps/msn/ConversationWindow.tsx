"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { XpIcon } from "@/components/desktop/XpIcon";
import { playXpSound } from "@/lib/audio/synth";
import { useDesktopStore } from "@/stores/desktop-store";
import { CONTACT_DISPLAY } from "@/content/server/chapter-two";
import { CONTACTS } from "@/content/public/contacts";

export function ConversationWindow() {
  const {
    messages,
    typing,
    view,
    invite,
    fileTransfer,
    busy,
    chooseReply,
    sendEvent,
    acceptWebcam,
    declineWebcam,
    decideFileTransfer,
  } = useNarrative();
  const [nudgeReady, setNudgeReady] = useState(true);
  const [nudging, setNudging] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);
  const choiceLock = useRef(false);
  const chatIsActive = useDesktopStore(
    (state) => state.activeWindowId === "msn-chat",
  );
  const activeContact = view?.activeContact ?? "sleepless_17";
  const contact = CONTACT_DISPLAY[activeContact];
  const visibleMessages = messages.filter((message) => message.contactId === activeContact);
  const avatar = CONTACTS.find((item) => item.id === activeContact);
  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  }, [visibleMessages.length, typing]);
  useEffect(() => {
    if (
      !chatIsActive ||
      !view?.online ||
      view.completed ||
      !["normal", "temporal_curiosity", "identity_suspicion", "post_webcam"].includes(
        view.phase,
      )
    )
      return;
    const requestedObjectId = view.requestedObjectId;
    const idle = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      void sendEvent(
        requestedObjectId
          ? { type: "REQUESTED_OBJECT_TIMEOUT", objectId: requestedObjectId }
          : { type: "IDLE_NUDGE_DUE" },
      );
    }, 90000);
    return () => clearTimeout(idle);
  }, [
    messages.length,
    chatIsActive,
    sendEvent,
    view?.completed,
    view?.online,
    view?.phase,
    view?.requestedObjectId,
  ]);
  const nudge = () => {
    if (!nudgeReady || view?.completed) return;
    setNudgeReady(false);
    setNudging(true);
    playXpSound("message");
    setTimeout(() => setNudging(false), 420);
    setTimeout(() => setNudgeReady(true), 10000);
  };
  return (
    <div className={`msn-conversation ${nudging ? "nudge-shake" : ""}`}>
      <div className="conversation-content">
        <section className="chat-column">
          <div className="recipient">
            To: <b>{contact.name}</b>{" "}
            <span>{view?.contactStatuses?.[activeContact] === "online" || (view?.chapter === 1 && view.online) ? "(Online)" : "(Offline)"}</span>
          </div>
          <div
            className="transcript"
            ref={transcript}
            aria-live="polite"
            data-testid="transcript"
          >
            <p className="conversation-note">
              You have started a conversation with {contact.name}.
            </p>
            {visibleMessages.map((m) => (
              <div
                key={m.id}
                className={
                  m.sender === "system" && m.text.startsWith("Daniel says:")
                    ? "line visitor"
                    : m.sender === "system"
                      ? "line system"
                      : "line emily"
                }
              >
                {m.sender === "system" && !m.text.startsWith("Daniel says:") ? (
                  <i>{m.text}</i>
                ) : (
                  <>
                    <b>
                      {m.sender !== "system" ? `${m.sender} says:` : "Daniel says:"}
                    </b>
                    <p>{m.text.replace(/^Daniel says:\n/, "")}</p>
                  </>
                )}
              </div>
            ))}
            {typing && <div className="typing">{contact.name} is typing...</div>}
            {fileTransfer && (
              <FileTransfer
                description={view?.fileOfferDescription ?? ""}
                onDecision={(decision) => void decideFileTransfer(decision)}
              />
            )}
          </div>
          <div className="story-replies" aria-label="Choose Daniel's reply">
            {view?.completed ? (
              <p className="story-ended">This conversation has ended.</p>
            ) : view?.choices?.length ? (
              view.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => {
                    if (choiceLock.current) return;
                    choiceLock.current = true;
                    void chooseReply(choice.id).finally(() => {
                      choiceLock.current = false;
                    });
                  }}
                  disabled={choice.disabled || busy || typing || !view.online}
                  data-testid={`choice-${choice.id}`}
                  className={`story-choice ${choice.tone}`}
                  title={choice.requirement ?? undefined}
                >
                  <span>{index + 1}</span>
                  <b>{choice.label}</b>
                  {choice.requirement && <small>{choice.requirement}</small>}
                </button>
              ))
            ) : (
              <p className="story-waiting">{view?.chapter === 2 && view.completedContacts.includes(activeContact) ? `${contact.name} is now offline.` : `${contact.name} is waiting…`}</p>
            )}
          </div>
          <div className="choice-foot">
            <span>{view?.chapter === 2 ? "Choose carefully · opened evidence changes what you can confront" : "Choose a reply · unlocked files may reveal stronger answers"}</span>
            <button aria-label="Nudge" onClick={nudge} disabled={!nudgeReady}>⚡ Nudge</button>
          </div>
        </section>
        <aside className="display-pictures">
          <div className="picture-frame">
            <Image
              src={(avatar && "avatar" in avatar && avatar.avatar) || "/assets/avatars/sleepless_17.webp"}
              alt={`${contact.name} display picture`}
              fill
              sizes="112px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="picture-frame daniel">
            <span>D</span>
          </div>
        </aside>
      </div>
      {invite && (
        <div className="msn-invite" role="dialog" aria-modal="true">
          <div className="invite-head">
            <span className="webcam-glyph">◉</span>
            <b>Video Conversation</b>
          </div>
          <p>
            <strong>{contact.name}</strong> would like to start a video
            conversation.
          </p>
          <div>
            <button
              onClick={() => void acceptWebcam()}
              data-testid="accept-webcam"
            >
              Accept
            </button>
            <button
              onClick={() => void declineWebcam()}
              data-testid="decline-webcam"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function FileTransfer({ description, onDecision }: { description: string; onDecision: (decision: "accepted" | "declined" | "inspected") => void }) {
  return (
    <div className="file-transfer chapter-two-transfer" role="dialog" aria-label="Incoming file transfer">
      <span>
        <XpIcon name="image-file" size={30} />
      </span>
      <div>
        <b>sleepless_17 (Offline) wants to send you a file:</b>
        <p>for_when_you_leave.scr (224 KB)</p>
        <small>Modified: 10/18/2005 2:24 AM{description ? ` · ${description}` : ""}</small>
      </div>
      <div className="transfer-actions">
        <button onClick={() => onDecision("accepted")}>Accept</button>
        <button onClick={() => onDecision("declined")}>Decline</button>
        <button onClick={() => onDecision("inspected")}>Details</button>
      </div>
    </div>
  );
}
