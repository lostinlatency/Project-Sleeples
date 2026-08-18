"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Ltx2Provider,
  useLtx2,
  useLtx2CommandError,
  useLtx2GenerationComplete,
  useLtx2GenerationFailed,
  useLtx2StateUpdate,
  useLtx2Track,
} from "@reactor-models/ltx2";
import {
  CHARACTER_WPM,
  FIXED_CHARACTER_SEED,
  FIXED_PERFORMANCE_PROMPT,
} from "./constants";

interface Props {
  token: string;
  script: string;
  startRequested: boolean;
  onReady: () => void;
  onComplete: () => void;
  onFailure: (reason: string) => void;
  onStream: (stream: MediaStream | null) => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAYS = [500, 1_500, 3_000];
const MEDIA_DRAIN_MS = 4_500;

export function LtxBridge(props: Props) {
  return (
    <Ltx2Provider jwtToken={props.token} connectOptions={{ autoConnect: false }}>
      <Controller {...props} />
    </Ltx2Provider>
  );
}

function Controller({
  script,
  startRequested,
  onReady,
  onComplete,
  onFailure,
  onStream,
}: Props) {
  const { status, sessionId, connect, uploadFile, sendCommand } = useLtx2();
  const connectionAttempted = useRef(false);
  const prepared = useRef(false);
  const readySent = useRef(false);
  const started = useRef(false);
  const settled = useRef(false);
  const completionPending = useRef(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const video = useLtx2Track("main_video");
  const audio = useLtx2Track("main_audio");

  const completeOnce = useCallback(() => {
    if (settled.current || completionPending.current) return;
    completionPending.current = true;
    completionTimer.current = setTimeout(() => {
      settled.current = true;
      onComplete();
    }, MEDIA_DRAIN_MS);
  }, [onComplete]);
  const failOnce = useCallback((reason: string) => {
    if (settled.current || completionPending.current) return;
    settled.current = true;
    onFailure(reason);
  }, [onFailure]);

  useEffect(() => {
    if (status !== "disconnected" || connectionAttempted.current) return;
    const timer = setTimeout(() => {
      connectionAttempted.current = true;
      void connect().catch((error) =>
        failOnce(error instanceof Error ? error.message : "connect"),
      );
    }, 50);
    return () => clearTimeout(timer);
  }, [connect, failOnce, status]);

  useEffect(() => {
    if (
      status !== "disconnected" ||
      !connectionAttempted.current ||
      !sessionId ||
      settled.current ||
      completionPending.current
    )
      return;
    const attempt = reconnectAttempts.current;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      failOnce("webrtc connection could not be restored");
      return;
    }
    const timer = setTimeout(() => {
      reconnectAttempts.current += 1;
      void connect(undefined, { sessionId, maxAttempts: 8 }).catch((error) => {
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS)
          failOnce(error instanceof Error ? error.message : "reconnect");
      });
    }, RECONNECT_DELAYS[attempt]);
    return () => clearTimeout(timer);
  }, [connect, failOnce, sessionId, status]);

  useEffect(() => {
    if (status === "ready") reconnectAttempts.current = 0;
  }, [status]);

  useEffect(() => {
    if (!video && !audio) {
      onStream(null);
      return;
    }
    onStream(
      new MediaStream(
        [video, audio].filter(Boolean) as MediaStreamTrack[],
      ),
    );
  }, [audio, onStream, video]);

  useEffect(() => {
    if (status !== "ready" || prepared.current) return;
    prepared.current = true;
    void (async () => {
      try {
        const blob = await fetch("/assets/avatars/sleepless_17.webp").then(
          (response) => response.blob(),
        );
        const ref = await uploadFile(blob);
        await Promise.all([
          sendCommand("set_avatar_image", { avatar_image: ref }),
          sendCommand("set_prompt", { prompt: FIXED_PERFORMANCE_PROMPT }),
          sendCommand("set_script", { script }),
          sendCommand("set_seed", { seed: FIXED_CHARACTER_SEED }),
          sendCommand("set_wpm", { wpm: CHARACTER_WPM }),
          sendCommand("set_duration_seconds", { duration_seconds: 0 }),
        ]);
      } catch (error) {
        failOnce(error instanceof Error ? error.message : "setup");
      }
    })();
  }, [failOnce, script, sendCommand, status, uploadFile]);

  useLtx2StateUpdate((message) => {
    if (message.finished && started.current) {
      completeOnce();
      return;
    }
    if (message.ready && !readySent.current) {
      readySent.current = true;
      onReady();
    }
  });

  useEffect(() => {
    if (!startRequested || !readySent.current || started.current) return;
    started.current = true;
    void sendCommand("start", {}).catch((error) =>
      failOnce(error instanceof Error ? error.message : "start"),
    );
  }, [failOnce, sendCommand, startRequested]);

  useLtx2GenerationComplete(completeOnce);
  useLtx2GenerationFailed((message) => failOnce(message.reason));
  useLtx2CommandError((message) =>
    failOnce(`${message.command}: ${message.reason}`),
  );

  useEffect(() => {
    const original = console.error;
    const guarded: typeof console.error = (...args) => {
      const message = args
        .filter((item): item is string => typeof item === "string")
        .join(" ");
      const transientChannelError =
        message.includes("[WebRTCTransport]") &&
        (message.includes("Control channel error") ||
          message.includes("Data channel error"));
      if (transientChannelError) {
        console.debug("[Reactor] WebRTC channel interrupted; reconnecting.");
        return;
      }
      original(...args);
    };
    console.error = guarded;

    const preventTransientRtcRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as
        | { constructor?: { name?: string }; type?: string }
        | null
        | undefined;
      if (
        reason?.constructor?.name === "RTCErrorEvent" ||
        reason?.type === "error"
      )
        event.preventDefault();
    };
    window.addEventListener("unhandledrejection", preventTransientRtcRejection);
    return () => {
      setTimeout(() => {
        if (console.error === guarded) console.error = original;
        window.removeEventListener(
          "unhandledrejection",
          preventTransientRtcRejection,
        );
      }, 1_500);
    };
  }, []);

  useEffect(
    () => () => {
      if (completionTimer.current) clearTimeout(completionTimer.current);
      onStream(null);
    },
    [onStream],
  );
  return null;
}
