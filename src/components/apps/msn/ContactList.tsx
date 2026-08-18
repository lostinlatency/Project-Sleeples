"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CONTACTS } from "@/content/public/contacts";
import { openApp } from "@/stores/desktop-store";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { playXpSound } from "@/lib/audio/synth";
import { XpIcon } from "@/components/desktop/XpIcon";
import type { ContactId } from "@/lib/director/types";
import { useDesktopStore } from "@/stores/desktop-store";

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
  const openContact = (contactId: ContactId) => {
    const contact = CONTACTS.find((item) => item.id === contactId)!;
    openApp("msn-chat", `${contact.name} - Conversation`, { contactId });
    useDesktopStore.getState().updateWindow("msn-chat", {
      title: `${contact.name} - Conversation`,
      payload: { contactId },
    });
    if (view?.chapter === 2)
      void sendEvent({ type: "CONTACT_OPENED", contactId });
    else if (contactId === "sleepless_17") {
      if (!view?.firstMessageSent) void sendEvent({ type: "MSN_OPENED" });
      else if (view.temporarilyOffline && !view.completed)
        void sendEvent({ type: "CHAT_REOPENED" });
    }
  };
  const onlineContacts = CONTACTS.filter((contact) =>
    view?.chapter === 2
      ? view.contactStatuses[contact.id as ContactId] === "online"
      : contact.id === "sleepless_17" && view?.online !== false,
  );
  const offline = CONTACTS.filter(
    (contact) => !onlineContacts.includes(contact),
  );
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
          <span>{onlineOpen ? "▾" : "▸"}</span> Online ({onlineContacts.length})
        </button>
        {onlineOpen &&
          onlineContacts.map((contact) => (
            <button
              key={contact.id}
              className="contact online"
              onDoubleClick={() => openContact(contact.id as ContactId)}
              onClick={() => openContact(contact.id as ContactId)}
              data-testid={
                contact.id === "sleepless_17"
                  ? "contact-sleepless"
                  : `contact-${contact.id}`
              }
              data-contact-id={contact.id}
            >
              <span className="presence">●</span>
              {"avatar" in contact ? (
                <Image src={contact.avatar} alt="" width={30} height={30} />
              ) : (
                <span className="blank-avatar">?</span>
              )}
              <span>
                <b>{contact.name}</b>
                <small> — {contact.line}</small>
              </span>
            </button>
          ))}
        <button
          className="contact-group"
          onClick={() => setOfflineOpen((value) => !value)}
          aria-expanded={offlineOpen}
        >
          <span>{offlineOpen ? "▾" : "▸"}</span> Offline ({offline.length})
        </button>
        {offlineOpen &&
          offline.map((c) => {
            const content = (
              <>
                <span className="presence">○</span>
                <span className="blank-avatar">?</span>
                <span>
                  {c.name}
                  {c.id === "sleepless_17" && (
                    <small> — Last seen: 10/18/2005</small>
                  )}
                </span>
              </>
            );
            return c.id === "sleepless_17" && view?.chapter !== 2 ? (
              <button
                key={c.id}
                className="contact offline"
                onDoubleClick={() => openContact("sleepless_17")}
                data-testid="contact-sleepless"
                data-contact-id={c.id}
              >
                {content}
              </button>
            ) : (
              <div key={c.id} className="contact offline">
                {content}
              </div>
            );
          })}
      </div>
    </div>
  );
}
