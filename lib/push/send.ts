import webpush from "web-push";
import { supabaseServer } from "@/lib/supabase/server";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

const statusMessages: Record<string, string> = {
  verified: "has been verified. Responders are on the way.",
  in_progress: "is being actively addressed by responders.",
  resolved: "has been resolved. Thank you for reporting.",
  rejected: "has been reviewed. No further action is required.",
};

export async function sendStatusPush(userId: string, incidentType: string, status: string) {
  ensureVapid();
  if (!vapidConfigured) return;

  const { data: subs } = await supabaseServer
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const body = `Your ${incidentType} report ${statusMessages[status] ?? "has been updated."}`;
  const payload = JSON.stringify({ title: "BayanAlert Update", body, tag: "bayanalert-status" });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  );
}
