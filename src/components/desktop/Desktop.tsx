"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { DesktopIcon } from "./DesktopIcon";
import { WindowManager } from "./WindowManager";
import { Taskbar } from "./Taskbar";
import { StartMenu } from "./StartMenu";
import { openApp, useDesktopStore } from "@/stores/desktop-store";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { playXpSound } from "@/lib/audio/synth";
import { MsnNotifications } from "./MsnNotifications";

export function Desktop() {
  const audioUnlocked = useRef(false);
  const [power, setPower] = useState<"on" | "shutdown" | "restarting" | "resisting">("on");
  const select = useDesktopStore((s) => s.selectIcon);
  const closeStart = useDesktopStore((s) => s.closeStart);
  const { ready, sessionError, reset, view, sendEvent } = useNarrative();
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready || view?.firstMessageSent) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        void sendEvent({ type: "MSN_OPENED" });
      } else {
        retry = setTimeout(fire, 1_200);
      }
    };
    const greeting = setTimeout(fire, 2_600);
    return () => {
      cancelled = true;
      clearTimeout(greeting);
      if (retry) clearTimeout(retry);
    };
  }, [ready, sendEvent, view?.firstMessageSent]);
  useEffect(
    () => () => {
      if (restartTimer.current) clearTimeout(restartTimer.current);
    },
    [],
  );

  const powerAction = (mode: "shutdown" | "restart") => {
    const resisted = mode === "shutdown" && Boolean(view?.resistShutdown);
    void sendEvent({ type: "POWER_ACTION_ATTEMPTED", action: mode });
    playXpSound("shutdown");
    setPower(resisted ? "resisting" : mode === "shutdown" ? "shutdown" : "restarting");
    if (resisted) {
      restartTimer.current = setTimeout(() => {
        setPower("on");
        openApp("msn-chat", "sleepless_17 - Conversation", { contactId: "sleepless_17" });
      }, 2_000);
      return;
    }
    if (mode === "restart")
      restartTimer.current = setTimeout(() => {
        useDesktopStore.getState().resetWindows();
        setPower("on");
        if ((view?.exposureStage ?? 0) >= 4) {
          openApp("msn-contacts", "MSN Messenger");
          if (view?.recoveredVideoAvailable)
            openApp("media-player", "emily_goodbye.wmv.partial");
        }
      }, 1800);
  };

  return (
    <main
      className="desktop-host"
      data-session-ready={ready ? "true" : "false"}
    >
      <div className="desktop-scale">
        <div
          className="xp-desktop"
          data-exposure={view?.exposureStage ?? 0}
          data-chapter-two={view?.chapter === 2 ? "true" : "false"}
          onPointerDown={(e) => {
            if (!audioUnlocked.current) {
              audioUnlocked.current = true;
              playXpSound("startup");
            }
            if (e.target === e.currentTarget) {
              select(null);
              closeStart();
            }
          }}
        >
          <div className="desktop-backdrop" aria-hidden="true">
            <Image
              className="wallpaper-flags"
              src="/assets/images/sleepless-meadow.png"
              alt=""
              width={1448}
              height={1086}
              priority
            />
          </div>
          {!ready && (
            <div className="boot-screen">
              <span className="xp-flag">▰</span>
              <strong>Microsoft Windows xp</strong>
              <div className="boot-meter">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
          {power !== "on" && (
            <div className="power-screen">
              {power === "shutdown" ? (
                <>
                  <div className="xp-logo-text">
                    Microsoft Windows <b>xp</b>
                  </div>
                  <p>It is now safe to turn off your computer.</p>
                  <button onClick={() => setPower("on")}>Turn on</button>
                </>
              ) : power === "resisting" ? (
                <>
                  <div className="xp-logo-text">Microsoft Windows <b>xp</b></div>
                  <p>saving active user...</p>
                </>
              ) : (
                <>
                  <div className="xp-logo-text">
                    Microsoft Windows <b>xp</b>
                  </div>
                  <p>Windows is restarting…</p>
                </>
              )}
            </div>
          )}
          <div className="desktop-icons">
            <DesktopIcon
              id="computer"
              label="My Computer"
              icon="computer"
              onOpen={() => openApp("computer")}
            />
            <DesktopIcon
              id="documents"
              label="My Documents"
              icon="documents"
              onOpen={() => openApp("documents")}
            />
            <DesktopIcon
              id="personal"
              label="Daniel's Stuff"
              icon="folder"
              onOpen={() =>
                openApp("folder", "Daniel's Stuff", { folderId: "personal" })
              }
            />
            <DesktopIcon
              id="msn"
              label="MSN Messenger 7.0"
              icon="msn"
              onOpen={() => openApp("msn-contacts")}
            />
            <DesktopIcon
              id="notepad"
              label="Notepad"
              icon="notepad"
              onOpen={() =>
                openApp("notepad", "Untitled - Notepad", { content: "" })
              }
            />
            <DesktopIcon
              id="recycle"
              label="Recycle Bin"
              icon="recycle"
              onOpen={() => openApp("recycle")}
            />
          </div>
          <WindowManager />
          <StartMenu onPower={powerAction} />
          <MsnNotifications />
          <Taskbar />
          {sessionError && (
            <div className="session-recovery" role="dialog" aria-modal="true">
              <h2>Recovered Session</h2>
              <p>
                Windows could not read the recovered MSN session. The file may
                be damaged or belong to another installation.
              </p>
              <button onClick={() => void reset()}>
                Reset recovered computer
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
