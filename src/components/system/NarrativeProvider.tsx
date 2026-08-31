"use client";
import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ContactId,
  DeliveredMessage,
  NarrativeEvent,
  PublicView,
  UiAction,
} from "@/lib/director/types";
import {
  loadSession,
  saveSession,
  clearSession,
  isCurrentSavedSession,
  normalizeSavedMessages,
  normalizeSavedPublicView,
} from "@/lib/narrative/client-persistence";
import { typingDuration } from "@/lib/timing/delivery";
import { recordNightLogEntry } from "@/lib/narrative/night-log";
import { openApp, useDesktopStore } from "@/stores/desktop-store";
import { playXpSound, setXpVolume } from "@/lib/audio/synth";
import { performancePromptFor } from "@/lib/reactor/constants";
const LtxBridge = dynamic(
  () => import("@/lib/reactor/LtxBridge").then((m) => m.LtxBridge),
  { ssr: false },
);
type OpenFile = {
  id: string;
  kind: string;
  title: string;
  content?: string;
  assetUrl?: string;
  corrupted?: boolean;
  caption?: string;
  meta?: string;
};
export interface MsnNotification {
  id: string;
  contactId: ContactId;
  text: string;
  kind: "message" | "online";
}
interface NarrativeContextValue {
  ready: boolean;
  view: PublicView | null;
  messages: DeliveredMessage[];
  typing: boolean;
  typingContactId: ContactId | string | null;
  busy: boolean;
  sessionError: boolean;
  invite: boolean;
  fileTransfer: boolean;
  webcamPlaying: boolean;
  webcamScript: string | null;
  webcamStream: MediaStream | null;
  reactorMode: "mock" | "live";
  sound: boolean;
  volume: number;
  notifications: MsnNotification[];
  chooseReply: (choiceId: string) => Promise<void>;
  sendEvent: (event: NarrativeEvent) => Promise<void>;
  openFile: (id: string) => Promise<OpenFile | null>;
  acceptWebcam: () => Promise<void>;
  declineWebcam: () => Promise<void>;
  decideFileTransfer: (
    decision: "accepted" | "declined" | "inspected",
  ) => Promise<void>;
  reset: () => Promise<void>;
  toggleSound: () => void;
  setVolume: (volume: number) => void;
  dismissNotification: (id: string) => void;
  openNotification: (notification: MsnNotification) => Promise<void>;
}
const Context = createContext<NarrativeContextValue | null>(null);
export function useNarrative() {
  const c = useContext(Context);
  if (!c) throw new Error("NarrativeProvider missing");
  return c;
}
const id = () => crypto.randomUUID();
export function NarrativeProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<PublicView | null>(null);
  const [messages, setMessages] = useState<DeliveredMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingContactId, setTypingContactId] = useState<
    ContactId | string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [invite, setInvite] = useState(false);
  const [fileTransfer, setFileTransfer] = useState(false);
  const [webcamPlaying, setWebcamPlaying] = useState(false);
  const [webcamScript, setWebcamScript] = useState<string | null>(null);
  const [webcamPerformanceNotes, setWebcamPerformanceNotes] = useState("");
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [reactorToken, setReactorToken] = useState<string | null>(null);
  const [reactorMode, setReactorMode] = useState<"mock" | "live">("mock");
  const [reactorStart, setReactorStart] = useState(false);
  const [sound, setSound] = useState(true);
  const [volume, setVolumeState] = useState(0.65);
  const [notifications, setNotifications] = useState<MsnNotification[]>([]);
  const envelopeRef = useRef("");
  const viewRef = useRef<PublicView | null>(null);
  const messagesRef = useRef<DeliveredMessage[]>([]);
  const requestChain = useRef<Promise<void>>(Promise.resolve());
  const webcamLock = useRef(false);
  const completionLock = useRef(false);
  const queueNotification = useCallback(
    (contactId: ContactId, text: string, kind: MsnNotification["kind"]) => {
      setNotifications((current) => {
        const existing = current.find((item) => item.contactId === contactId);
        const notification = {
          id: existing?.id ?? `msn-${contactId}-${Date.now()}`,
          contactId,
          text,
          kind,
        };
        return [
          ...current.filter((item) => item.contactId !== contactId),
          notification,
        ].slice(-3);
      });
    },
    [],
  );
  const persist = useCallback(
    (e: string, v: PublicView, m = messagesRef.current) => {
      const previous = viewRef.current;
      envelopeRef.current = e;
      viewRef.current = v;
      messagesRef.current = m;
      setView(v);
      if (v.completed && !previous?.completed) {
        recordNightLogEntry({
          route: v.storyRoute,
          decision: v.finalDecision ?? "",
          flags: v.flagsOutcome,
          at: new Date().toISOString(),
        });
      }
      if (previous?.chapter === 2 && v.chapter === 2) {
        const previews: Partial<Record<ContactId, string>> = {
          mike_sk8: "Daniel's computer just appeared online. Don't close MSN.",
          sarahlou_x: "Mike told me you found BRB. We need to talk.",
          tom_d:
            "I'm Daniel's brother. I was the last one to shut that computer down.",
          sleepless_17: "i remember things that didnt happen to me",
        };
        const notificationOrder: ContactId[] = [
          "mike_sk8",
          "sarahlou_x",
          "tom_d",
          "sleepless_17",
        ];
        const newlyOnline = notificationOrder.filter(
          (contactId) =>
            previous.contactStatuses[contactId] !== "online" &&
            v.contactStatuses[contactId] === "online",
        );
        const contactId = newlyOnline[0];
        if (contactId)
          queueNotification(
            contactId,
            previews[contactId] ?? "is now online",
            "online",
          );
      }
      void saveSession({ envelope: e, publicView: v, messages: m });
    },
    [queueNotification],
  );
  useEffect(() => {
    void (async () => {
      const saved = await loadSession();
      if (isCurrentSavedSession(saved)) {
        const normalizedView = normalizeSavedPublicView(saved.publicView);
        const normalizedMessages = normalizeSavedMessages(saved.messages);
        envelopeRef.current = saved.envelope;
        viewRef.current = normalizedView;
        messagesRef.current = normalizedMessages;
        setView(normalizedView);
        setMessages(normalizedMessages);
        setReady(true);
        return;
      }
      if (saved) await clearSession();
      const r = await fetch("/api/session/new", { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        setSessionError(true);
        setReady(true);
        return;
      }
      envelopeRef.current = data.sessionEnvelope;
      viewRef.current = data.publicView;
      messagesRef.current = [];
      setView(data.publicView);
      await saveSession({
        envelope: data.sessionEnvelope,
        publicView: data.publicView,
        messages: [],
      });
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    setXpVolume(sound ? volume : 0);
  }, [sound, volume]);
  const enqueue = useCallback(async <T,>(operation: () => Promise<T>) => {
    let result!: T;
    const task = requestChain.current.then(async () => {
      result = await operation();
    });
    requestChain.current = task.catch(() => {});
    await task;
    return result;
  }, []);
  const beep = useCallback(
    (kind = "message") => {
      if (!sound || volume <= 0) return;
      const mapped =
        kind === "error"
          ? "error"
          : kind === "invite"
            ? "invite"
            : kind === "transfer"
              ? "transfer"
              : "message";
      playXpSound(mapped);
    },
    [sound, volume],
  );
  const applyActions = useCallback(
    (actions: UiAction[]) => {
      for (const a of actions) {
        if (a.type === "OPEN_CONVERSATION") openApp("msn-chat");
        if (a.type === "SHOW_WEBCAM_INVITE") setInvite(true);
        if (a.type === "SHOW_FILE_TRANSFER") {
          setFileTransfer(true);
          beep("transfer");
        }
        if (a.type === "SHOW_GAME_INVITE") beep("invite");
        if (a.type === "OPEN_GAME") {
          beep("message");
          openApp("game", "Minesweeper Flags");
        }
        if (a.type === "OPEN_PINBALL")
          openApp("pinball", "3D Pinball for Windows - Space Cadet");
        if (a.type === "OPEN_RECOVERED_VIDEO")
          openApp("media-player", "emily_goodbye.wmv.partial");
        if (a.type === "PLAY_SOUND") beep(a.payload);
        if (a.type === "GLITCH_EMILY_AVATAR") {
          document.documentElement.classList.add("brb-avatar-glitch");
          window.setTimeout(
            () => document.documentElement.classList.remove("brb-avatar-glitch"),
            500,
          );
        }
        if (a.type === "RUN_DESKTOP_TAKEOVER") {
          const desktop = useDesktopStore.getState();
          for (const window of Object.values(desktop.windows)) {
            if (!["msn-chat", "msn-contacts"].includes(window.app))
              desktop.minimizeWindow(window.id);
          }
          window.setTimeout(() => {
            openApp("playlist", "WINAMP — external stream", {
              content: "#EXTM3U\n01. external stream — --:--",
            });
            openApp("notepad", "I SAID BRB - Notepad", {
              content: "I SAID BRB",
            });
            const current = useDesktopStore.getState();
            if (current.windows["msn-chat"])
              current.updateWindow("msn-chat", {
                title: `${a.payload || "unknown_visitor"} - Conversation`,
              });
          }, 700);
          window.setTimeout(() => {
            const current = useDesktopStore.getState();
            if (current.windows["msn-chat"])
              current.updateWindow("msn-chat", {
                title: "sleepless_17 - Conversation",
              });
          }, 9000);
        }
        if (a.type === "RESTORE_POST_ENDING_CONTROL") {
          const ending = viewRef.current?.finalDecision;
          const desktop = useDesktopStore.getState();
          if (ending === "quarantine") {
            for (const item of Object.values(desktop.windows)) {
              if (item.app === "playlist")
                desktop.closeWindow(item.id);
            }
          }
          if (ending === "release") {
            window.setTimeout(() => {
              openApp("msn-contacts", "MSN Messenger");
              const current = useDesktopStore.getState();
              current.openWindow({
                id: "messenger-service",
                app: "msn-contacts",
                title: "Messenger Service",
                x: 370,
                y: 86,
                width: 300,
                height: 565,
                resizable: false,
              });
            }, 9000);
          }
          if (ending === "erase") {
            for (const item of Object.values(desktop.windows)) {
              if (["playlist", "media-player"].includes(item.app)) desktop.closeWindow(item.id);
            }
          }
        }
      }
    },
    [beep],
  );
  const append = useCallback((items: DeliveredMessage[]) => {
    setMessages((old) => {
      const next = [...old, ...items];
      messagesRef.current = next;
      void saveSession({
        envelope: envelopeRef.current,
        publicView: viewRef.current,
        messages: next,
      });
      return next;
    });
  }, []);
  const deliver = useCallback(
    async (items: DeliveredMessage[]) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.sender !== "system") {
          setTyping(true);
          setTypingContactId(item.contactId);
          await new Promise((r) =>
            setTimeout(
              r,
              Math.min(1600, typingDuration(item.text, item.delivery, i + 1)),
            ),
          );

          setTyping(false);
          setTypingContactId(null);
        }
        append([item]);
        if (item.sender !== "system") {
          beep();
          const desktop = useDesktopStore.getState();
          const chat = desktop.windows["msn-chat"];
          const chatVisible =
            desktop.activeWindowId === "msn-chat" &&
            chat &&
            !chat.minimized &&
            viewRef.current?.activeContact === item.contactId;
          if (!chatVisible)
            queueNotification(item.contactId, item.text, "message");
        }
        await new Promise((r) => setTimeout(r, 220));
      }
    },
    [append, beep, queueNotification],
  );
  const rawEvent = useCallback(
    async (event: NarrativeEvent) => {
      if (!envelopeRef.current) return;
      setBusy(true);
      if (event.type === "USER_MESSAGES") {
        setTyping(true);
        setTypingContactId(viewRef.current?.activeContact ?? "sleepless_17");
      }
      try {
        let pending: NarrativeEvent | null = event;
        while (pending) {
          const r: Response = await fetch("/api/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionEnvelope: envelopeRef.current,
              idempotencyKey: id(),
              event: pending,
            }),
          });
          const data = await r.json();
          if (!r.ok) {
            if (String(data.error?.code || "").startsWith("SESSION_"))
              setSessionError(true);
            throw new Error(data.error?.code || "CONNECTION_ERROR");
          }
          persist(data.sessionEnvelope, data.publicView);
          applyActions(data.uiActions || []);
          pending = null;
          if (data.webcamPreparation) {
            completionLock.current = false;
            webcamLock.current = false;
            setReactorStart(false);
            setWebcamScript(data.webcamPreparation.spokenScript);
            setWebcamPerformanceNotes(data.webcamPreparation.performanceNotes);
            const tokenResponse = await fetch("/api/reactor/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionEnvelope: data.sessionEnvelope }),
            });
            if (!tokenResponse.ok)
              pending = { type: "LTX_FAILED", reason: "token" };
            else {
              const tokenData = (await tokenResponse.json()) as {
                token: string;
                mode: "mock" | "live";
              };
              setReactorMode(tokenData.mode);
              if (tokenData.mode === "live") setReactorToken(tokenData.token);
              else pending = { type: "LTX_CONDITIONS_READY" };
            }
          }
          setTyping(false);
          await deliver(data.messages || []);
        }
      } catch (error) {
        if (!(error instanceof Error && error.message.startsWith("SESSION_")))
          append([
            {
              id: `connection-${Date.now()}`,
              sender: "system",
              contactId: viewRef.current?.activeContact ?? "sleepless_17",
              text: "The following message could not be delivered.",
              delivery: "direct",
            },
          ]);
        console.error(
          "[sleepless] narrative request failed",
          error instanceof Error ? error.message : "unknown",
        );
      } finally {
        setBusy(false);
        setTyping(false);
        setTypingContactId(null);
      }
    },
    [append, applyActions, deliver, persist],
  );
  const sendEvent = useCallback(
    (event: NarrativeEvent) => enqueue(() => rawEvent(event)),
    [enqueue, rawEvent],
  );
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications((current) =>
      current.filter((item) => item.id !== notificationId),
    );
  }, []);
  const openNotification = useCallback(
    async (notification: MsnNotification) => {
      dismissNotification(notification.id);
      const name = notification.contactId;
      openApp("msn-chat", `${name} - Conversation`, {
        contactId: notification.contactId,
      });
      if (viewRef.current?.chapter === 2)
        await sendEvent({
          type: "CONTACT_OPENED",
          contactId: notification.contactId,
        });
    },
    [dismissNotification, sendEvent],
  );
  const chooseReply = useCallback(
    async (choiceId: string) => {
      if (busy || viewRef.current?.completed) return;
      const current = viewRef.current;
      if (current?.chapter === 2) {
        if (choiceId.startsWith("final-")) {
          await sendEvent({
            type: "CHAPTER_TWO_FINAL_DECISION",
            decision: choiceId.replace("final-", "") as
              "quarantine" | "release" | "erase",
          });
        } else await sendEvent({ type: "CONTACT_CHOICE", choiceId });
      } else await sendEvent({ type: "STORY_CHOICE", choiceId });
    },
    [busy, sendEvent],
  );
  const openFile = useCallback(
    (fileId: string) =>
      enqueue(async () => {
        if (!envelopeRef.current) return null;
        const r = await fetch("/api/files/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionEnvelope: envelopeRef.current,
            fileId,
            idempotencyKey: id(),
          }),
        });
        const data = await r.json();
        if (!r.ok) {
          if (String(data.error?.code || "").startsWith("SESSION_"))
            setSessionError(true);
          beep("error");
          return null;
        }
        persist(data.sessionEnvelope, data.publicView);
        applyActions(data.uiActions || []);
        void deliver(data.messages || []);
        const file = data.file as OpenFile;
        if (fileId === "webcam_still" && file.assetUrl)
          openApp("image", file.title, {
            fileId: file.id,
            title: file.title,
            assetUrl: file.assetUrl,
          });
        return file;
      }),
    [applyActions, beep, deliver, enqueue, persist],
  );
  const acceptWebcam = useCallback(async () => {
    if (webcamLock.current) return;
    webcamLock.current = true;
    setInvite(false);
    setWebcamPlaying(true);
    await sendEvent({ type: "WEBCAM_ACCEPTED" });
    openApp(
      "msn-video",
      `Video Conversation — ${viewRef.current?.activeContact ?? "sleepless_17"}`,
    );
    if (reactorMode === "live") setReactorStart(true);
    else
      setTimeout(() => {
        void sendEvent({ type: "LTX_COMPLETED" }).finally(() => {
          webcamLock.current = false;
        });
        setTimeout(() => {
          setWebcamPlaying(false);
          useDesktopStore.getState().closeWindow("msn-video");
        }, 1_500);
      }, 6500);
  }, [reactorMode, sendEvent]);
  const declineWebcam = useCallback(async () => {
    if (webcamLock.current) return;
    webcamLock.current = true;
    setInvite(false);
    setWebcamPlaying(false);
    setReactorToken(null);
    await sendEvent({ type: "WEBCAM_DECLINED" });
    webcamLock.current = false;
  }, [sendEvent]);
  const decideFileTransfer = useCallback(
    async (decision: "accepted" | "declined" | "inspected") => {
      setFileTransfer(false);
      await sendEvent({ type: "FILE_TRANSFER_DECIDED", decision });
    },
    [sendEvent],
  );
  const reset = useCallback(async () => {
    await clearSession();
    location.reload();
  }, []);
  const setVolume = useCallback((next: number) => {
    setVolumeState(Math.max(0, Math.min(1, next)));
    if (next > 0) setSound(true);
  }, []);
  const value = useMemo(
    () => ({
      ready,
      view,
      messages,
      typing,
      typingContactId,
      busy,
      sessionError,
      invite,
      fileTransfer:
        fileTransfer ||
        (view?.chapter === 2 &&
          view.chapterTwoStage === "file_offer" &&
          view.fileTransferDecision === "pending"),
      webcamPlaying,
      webcamScript,
      webcamStream,
      reactorMode,
      sound,
      volume,
      notifications,
      chooseReply,
      sendEvent,
      openFile,
      acceptWebcam,
      declineWebcam,
      decideFileTransfer,
      reset,
      toggleSound: () => setSound((s) => !s),
      setVolume,
      dismissNotification,
      openNotification,
    }),
    [
      acceptWebcam,
      busy,
      chooseReply,
      declineWebcam,
      decideFileTransfer,
      dismissNotification,
      fileTransfer,
      invite,
      messages,
      notifications,
      openFile,
      openNotification,
      ready,
      reactorMode,
      reset,
      sendEvent,
      sessionError,
      setVolume,
      sound,
      typing,
      typingContactId,
      view,
      volume,
      webcamPlaying,
      webcamScript,
      webcamStream,
    ],
  );
  return (
    <Context.Provider value={value}>
      {children}
      {reactorToken && webcamScript && (
        <LtxBridge
          key={`${view?.activeContact ?? "sleepless_17"}-${webcamScript}`}
          token={reactorToken}
          script={webcamScript}
          avatarPath={
            view?.activeContact === "mike_sk8"
              ? "/assets/avatars/mike_sk8-v2.jpg"
              : view?.activeContact === "sarahlou_x"
                ? "/assets/avatars/sarahlou_x-v2.jpg"
                : view?.activeContact === "tom_d"
                  ? "/assets/avatars/tom_d-v2.jpg"
                  : "/assets/avatars/sleepless_17.webp"
          }
          performancePrompt={performancePromptFor(
            view?.activeContact ?? "sleepless_17",
            webcamPerformanceNotes,
          )}
          startRequested={reactorStart}
          onReady={() => void sendEvent({ type: "LTX_CONDITIONS_READY" })}
          onComplete={() => {
            if (completionLock.current) return;
            completionLock.current = true;
            webcamLock.current = false;
            setReactorStart(false);
            setReactorToken(null);
            setWebcamPlaying(false);
            useDesktopStore.getState().closeWindow("msn-video");
            void sendEvent({ type: "LTX_COMPLETED" });
          }}
          onFailure={(reason) => {
            if (completionLock.current) return;
            completionLock.current = true;
            webcamLock.current = false;
            setReactorStart(false);
            setReactorToken(null);
            setWebcamPlaying(false);
            useDesktopStore.getState().closeWindow("msn-video");
            void sendEvent({
              type: "LTX_FAILED",
              reason: reason.slice(0, 100),
            });
          }}
          onStream={setWebcamStream}
        />
      )}
    </Context.Provider>
  );
}
