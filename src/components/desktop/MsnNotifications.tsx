"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  type MsnNotification,
  useNarrative,
} from "@/components/system/NarrativeProvider";
import { CONTACTS } from "@/content/public/contacts";
import { XpIcon } from "./XpIcon";

export function MsnNotifications() {
  const { notifications, dismissNotification, openNotification } =
    useNarrative();
  return (
    <aside
      className="msn-notifications"
      aria-label="MSN notifications"
      aria-live="polite"
    >
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
          onOpen={openNotification}
        />
      ))}
    </aside>
  );
}

function NotificationCard({
  notification,
  onDismiss,
  onOpen,
}: {
  notification: MsnNotification;
  onDismiss: (id: string) => void;
  onOpen: (notification: MsnNotification) => Promise<void>;
}) {
  const [closing, setClosing] = useState(false);
  const contact = CONTACTS.find((item) => item.id === notification.contactId);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (notification.kind === "message") return;
    const beginClose = setTimeout(() => setClosing(true), 9_000);
    const remove = setTimeout(() => onDismiss(notification.id), 9_220);
    return () => {
      clearTimeout(beginClose);
      clearTimeout(remove);
    };
  }, [notification.id, notification.kind, notification.text, onDismiss]);
  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );
  const dismiss = () => {
    setClosing(true);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => onDismiss(notification.id), 180);
  };
  return (
    <section
      className={`msn-notification ${closing ? "closing" : ""}`}
      data-testid={`msn-notification-${notification.contactId}`}
    >
      <header>
        <span>
          <XpIcon name="msn" size={16} /> MSN Messenger
        </span>
        <button onClick={dismiss} aria-label="Dismiss notification">
          ×
        </button>
      </header>
      <button
        className="notification-body"
        onClick={() => {
          void onOpen(notification).catch(() => {});
        }}
      >
        {contact && "avatar" in contact ? (
          <Image src={contact.avatar} alt="" width={42} height={42} />
        ) : (
          <span className="notification-avatar">?</span>
        )}
        <span>
          <b>{contact?.name ?? notification.contactId}</b>
          <small>
            {notification.kind === "online"
              ? "is now online"
              : "sent you a message"}
          </small>
          <p>{notification.text}</p>
        </span>
      </button>
    </section>
  );
}
