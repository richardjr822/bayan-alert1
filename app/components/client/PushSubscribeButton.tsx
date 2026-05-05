"use client";

import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "subscribed" | "unsubscribed" | "error";

function detectSupport(): State {
  if (typeof window === "undefined") return "loading";
  if (!("PushManager" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return "loading";
}

export default function PushSubscribeButton() {
  const [state, setState] = useState<State>(detectSupport);

  useEffect(() => {
    if (state !== "loading") return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setState("error"));
  }, [state]);

  async function subscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) { setState("unsupported"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setState("subscribed");
    } catch {
      setState("error");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  if (state === "subscribed") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-[var(--green-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--green)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]"></span>
        Push notifications on
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--text)] shadow-sm transition hover:bg-[var(--bg-gray)]"
    >
      <i className="fa-regular fa-bell text-[var(--red)]"></i>
      Enable Push Notifications
    </button>
  );
}
