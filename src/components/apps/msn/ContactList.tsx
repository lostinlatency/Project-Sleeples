"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { CONTACTS } from "@/content/public/contacts";
import { openApp } from "@/stores/desktop-store";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { playXpSound } from "@/lib/audio/synth";
import { XpIcon } from "@/components/desktop/XpIcon";
import type { ContactId } from "@/lib/director/types";

export function ContactList() {
  const { sendEvent, view } = useNarrative();
  const [onlineOpen, setOnlineOpen] = useState(true);
  const [offlineOpen, setOfflineOpen] = useState(true);
  useEffect(() => {
    playXpSound("sign-in");
  }, []);
  const openContact = (contactId: ContactId) => {
    const contact = CONTACTS.find((item) => item.id === contactId);
    if (!contact) return;
    openApp("msn-chat", `${contact.name} - Conversation`, { contactId });
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
      <input
        className="contact-search"
        type="text"
        placeholder="Find a contact or number"
        aria-label="Find a contact or number"
        disabled
      />
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
                <Image className={contact.id === "sleepless_17" ? `emily-avatar ${view?.emilyAvatarVariant ?? "normal"}` : undefined} src={contact.avatar} alt="" width={30} height={30} />
              ) : (
                <span className="blank-avatar">?</span>
              )}
              <span>
                <b>{contact.name}</b>
                <small> — {contact.line}</small>
              </span>
            </button>
          ))}
        {onlineOpen && view?.finalDecision === "release" ? (
          <div className="contact online brb-unknown-contact" data-testid="contact-unknown-visitor">
            <span className="presence">●</span>
            <Image className="emily-avatar unknown" src="/assets/avatars/sleepless_17.webp" alt="" width={30} height={30} />
            <span><b>unknown_visitor</b><small> — im not waiting anymore</small></span>
          </div>
        ) : null}
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
            const storyContact = [
              "sleepless_17",
              "mike_sk8",
              "sarahlou_x",
              "tom_d",
            ].includes(c.id);
            return storyContact ? (
              <button
                key={c.id}
                className="contact offline"
                onClick={() => openContact(c.id as ContactId)}
                data-testid={
                  c.id === "sleepless_17"
                    ? "contact-sleepless"
                    : `contact-${c.id}`
                }
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
