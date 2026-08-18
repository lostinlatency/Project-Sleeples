"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CONTACTS } from "@/content/public/contacts";
import { openApp } from "@/stores/desktop-store";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { playXpSound } from "@/lib/audio/synth";
import { XpIcon } from "@/components/desktop/XpIcon";

export function ContactList() {
  const { sendEvent, view } = useNarrative();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onlineOpen, setOnlineOpen] = useState(true);
  const [offlineOpen, setOfflineOpen] = useState(true);
  useEffect(() => {
    playXpSound("sign-in");
  }, []);
  useEffect(() => {
    if (view && !view.firstMessageSent) {
      timer.current = setTimeout(() => {
        if (document.visibilityState === "visible")
          void sendEvent({ type: "MSN_OPENED" });
      }, 3600);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sendEvent, view]);
  const online = view?.online !== false;
  const sleeping = CONTACTS[0];
  const openSleepless = () => {
    openApp("msn-chat");
    if (!view?.firstMessageSent) void sendEvent({ type: "MSN_OPENED" });
    else if (view.temporarilyOffline && !view.completed)
      void sendEvent({ type: "CHAT_REOPENED" });
  };
  const offline = online
    ? CONTACTS.filter((c) => c.status === "offline")
    : CONTACTS;
  return (
    <div className="msn-contact">
      <div className="msn-brand">
        <XpIcon name="msn" size={34} />
        <b>MSN</b>
        <small>Messenger</small>
      </div>
      <div className="profile">
        <div className="profile-pic">D</div>
        <div>
          <strong>Daniel</strong>
          <span> (Online) ▾</span>
          <p>moving soon. maybe.</p>
        </div>
      </div>
      <div className="contact-search">Find a contact or number</div>
      <div className="contacts">
        <button
          className="contact-group"
          onClick={() => setOnlineOpen((value) => !value)}
          aria-expanded={onlineOpen}
        >
          <span>{onlineOpen ? "▾" : "▸"}</span> Online ({online ? 1 : 0})
        </button>
        {onlineOpen && online && (
          <button
            className="contact online"
            onDoubleClick={openSleepless}
            data-testid="contact-sleepless"
          >
            <span className="presence">●</span>
            <Image src={sleeping.avatar!} alt="" width={30} height={30} />
            <span>
              <b>{sleeping.name}</b>
              <small> — {sleeping.line}</small>
            </span>
          </button>
        )}
        <button
          className="contact-group"
          onClick={() => setOfflineOpen((value) => !value)}
          aria-expanded={offlineOpen}
        >
          <span>{offlineOpen ? "▾" : "▸"}</span> Offline ({offline.length})
        </button>
        {offlineOpen &&
          offline.map((c) => {
            const content = <>
              <span className="presence">○</span>
              <span className="blank-avatar">?</span>
              <span>
                {c.name}
                {c.id === "sleepless" && (
                  <small> — Last seen: 10/18/2005</small>
                )}
              </span>
            </>;
            return c.id === "sleepless" ? (
              <button key={c.id} className="contact offline" onDoubleClick={openSleepless} data-testid="contact-sleepless">
                {content}
              </button>
            ) : (
              <div key={c.id} className="contact offline">{content}</div>
            );
          })}
      </div>
    </div>
  );
}
