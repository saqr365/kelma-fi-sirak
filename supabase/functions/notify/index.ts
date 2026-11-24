import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails("mailto:kelmafisirak.eg@gmail.com", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const payload = await req.json();
  const linkId = payload?.record?.link_id;
  if (payload?.type !== "INSERT" || !linkId) return new Response("ignored");

  const { data: link } = await sb.from("links").select("owner").eq("id", linkId).single();
  if (!link) return new Response("no link");
  const { data: subs } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("owner", link.owner);

  const body = JSON.stringify({ title: "كلمة في سرك", body: "وصلتك كلمة جديدة", url: "./" });
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 });
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
    }
  }));
  return new Response("ok");
});
