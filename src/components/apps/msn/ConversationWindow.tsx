"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { XpIcon } from "@/components/desktop/XpIcon";
import { playXpSound } from "@/lib/audio/synth";
import { useDesktopStore } from "@/stores/desktop-store";
import { CONTACT_DISPLAY } from "@/content/public/contact-display";
import { CONTACTS } from "@/content/public/contacts";

const TYPING_LIMIT_MS = 45_000;

export function ConversationWindow() {
  const {
    messages,
    typing,
    typingContactId,
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
  const nudgeTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const chatIsActive = useDesktopStore(
    (state) =>
      state.activeWindowId === "msn-chat" ||
      (state.activeWindowId ?? "").startsWith("msn-chat-"),
  );
  const activeContact = view?.activeContact ?? "sleepless_17";
  const contact = CONTACT_DISPLAY[activeContact];
  const visibleMessages = messages.filter((message) => message.contactId === activeContact);
  const avatar = CONTACTS.find((item) => item.id === activeContact);
  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  }, [visibleMessages.length, typing]);
  useEffect(
    () => () => {
      for (const timer of nudgeTimers.current) clearTimeout(timer);
    },
    [],
  );
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
    nudgeTimers.current.push(setTimeout(() => setNudging(false), 420));
    nudgeTimers.current.push(setTimeout(() => setNudgeReady(true), 10000));
  };
  const gameInvite = view?.chapter === 1 && view?.flagsStatus === "offered";
  const typingOffered =
    view?.chapter === 1 && view?.typingTestStatus === "offered";
  const gameButton =
    view?.chapter === 1 &&
    !view?.completed &&
    view?.online &&
    view?.flagsStatus !== "offered" &&
    !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
      view?.phase ?? "",
    );
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
            {typing &&
              typingContactId === activeContact && (
                <div className="typing">{contact.name} is typing...</div>
              )}
            {fileTransfer && (
              <FileTransfer
                description={view?.fileOfferDescription ?? ""}
                onDecision={(decision) => void decideFileTransfer(decision)}
              />
            )}
          </div>
          <div className="story-replies" aria-label="Choose Daniel's reply">
            {typingOffered && <TypingTestBlock />}
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
            <span className="foot-actions">
              {gameButton && (
                <button
                  className="invite-game"
                  aria-label="Invite to game"
                  data-testid="invite-game"
                  onClick={() => void sendEvent({ type: "GAME_INVITE_REQUESTED" })}
                >
                  <XpIcon name="games" size={14} /> Games ▸
                </button>
              )}
              <button aria-label="Nudge" onClick={nudge} disabled={!nudgeReady}>⚡ Nudge</button>
            </span>
          </div>
        </section>
        <aside className="display-pictures">
          <div className="picture-frame">
            <Image
              src={(avatar && "avatar" in avatar && avatar.avatar) || "/assets/avatars/sleepless_17.webp"}
              className={activeContact === "sleepless_17" ? `emily-avatar ${view?.emilyAvatarVariant ?? "normal"}` : undefined}
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
      {gameInvite && (
        <div className="msn-invite" role="dialog" aria-modal="true" data-testid="game-invite">
          <div className="invite-head">
            <XpIcon name="games" size={18} />
            <b>Game Invitation</b>
          </div>
          <p>
            <strong>sleepless_17</strong> would like to play{" "}
            <strong>Minesweeper Flags</strong>. First to 26 mines wins.
          </p>
          <div>
            <button
              data-testid="accept-game"
              autoFocus
              onClick={() => void sendEvent({ type: "GAME_INVITE_ACCEPTED" })}
            >
              Accept
            </button>
            <button
              data-testid="decline-game"
              onClick={() => void sendEvent({ type: "GAME_INVITE_DECLINED" })}
            >
              Decline
            </button>
          </div>
        </div>
      )}
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
              autoFocus
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
function TypingTestBlock() {
  const { sendEvent } = useNarrative();
  const [text, setText] = useState("");
  const [left, setLeft] = useState(TYPING_LIMIT_MS / 1000);
  const [submitted, setSubmitted] = useState(false);
  const leftRef = useRef(TYPING_LIMIT_MS / 1000);
  const settled = useRef(false);
  const skip = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    setSubmitted(true);
    setLeft(0);
    void sendEvent({ type: "TYPING_TEST_SKIPPED" });
  }, [sendEvent]);
  useEffect(() => {
    if (settled.current) return;
    const timer = setInterval(() => {
      leftRef.current = Math.max(0, leftRef.current - 1);
      setLeft(leftRef.current);
      if (leftRef.current === 0 && !settled.current) {
        settled.current = true;
        setSubmitted(true);
        void sendEvent({ type: "TYPING_TEST_SKIPPED" });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sendEvent]);
  const submit = () => {
    if (settled.current) return;
    const trimmed = text.trim();
    if (trimmed.length < 1) return;
    settled.current = true;
    setSubmitted(true);
    void sendEvent({ type: "TYPING_TEST_SUBMITTED", text: trimmed.slice(0, 200) });
  };
  const tooLong = text.trim().length > 90;
  return (
    <div className="typing-test" data-testid="typing-test">
      <b>Prove it — type it like Daniel would</b>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, 200))}
        placeholder="lowercase. short. like he's half-asleep…"
        aria-label="Type like Daniel"
        spellCheck={false}
        rows={2}
      />
      <div className="typing-test-foot">
        <small className={left <= 10 ? "urgent" : undefined}>
          {left}s · {text.trim().length} chars
          {tooLong ? " · he never wrote essays" : ""}
        </small>
        <span>
          <button onClick={skip} disabled={submitted || left === 0}>
            Refuse
          </button>
          <button
            data-testid="submit-typing"
            onClick={submit}
            disabled={!text.trim() || tooLong || submitted}
          >
            Send
          </button>
        </span>
      </div>
    </div>
  );
}
function FileTransfer({ description, onDecision }: { description: string; onDecision: (decision: "accepted" | "declined" | "inspected") => void }) {  return (
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
