import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = (await req.json()) as PushSubscriptionJSON;
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await supabaseServer.from("push_subscriptions").upsert(
    {
      user_id: session.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );

  return NextResponse.json({ success: true });
}
