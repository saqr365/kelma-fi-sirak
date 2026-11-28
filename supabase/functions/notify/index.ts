import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails("mailto:kelmafisirak.eg@gmail.com", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const SITE = "https://saqr365.github.io/kelma-fi-sirak/";
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

async function sendEmail(to: string, linkName: string) {
  const user = Deno.env.get("SMTP_USER"), pass = Deno.env.get("SMTP_PASS");
  if (!user || !pass) { console.error("missing SMTP secrets"); return; }
  const client = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } } });
  try {
    await client.send({
      from: `كلمة في سرك <${user}>`,
      to,
      subject: "وصلتك كلمة جديدة",
      content: `وصلتك كلمة جديدة على لينك «${linkName}».\nافتح الموقع لتقرأها: ${SITE}`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8"><h2>كلمة في سرك</h2><p>وصلتك كلمة جديدة على لينك «${esc(linkName)}».</p><p><a href="${SITE}">افتح الموقع لتقرأها</a></p></div>`,
    });
  } finally {
    await client.close();
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const payload = await req.json();
  const linkId = payload?.record?.link_id;
  if (payload?.type !== "INSERT" || !linkId) return new Response("ignored");

  const { data: link } = await sb.from("links").select("owner,name").eq("id", linkId).single();
  if (!link) return new Response("no link");
  const { data: pref } = await sb.from("user_prefs").select("notify").eq("owner", link.owner).maybeSingle();
  const mode = pref?.notify ?? "push";
  const tasks: Promise<unknown>[] = [];
  console.log("notify mode", mode);

  if (mode === "push" || mode === "both") {
    const { data: subs } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("owner", link.owner);
    const body = JSON.stringify({ title: "كلمة في سرك", body: "وصلتك كلمة جديدة", url: "./" });
    for (const s of subs ?? []) {
      tasks.push((async () => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 });
        } catch (e) {
          const code = (e as { statusCode?: number })?.statusCode;
          if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
        }
      })());
    }
  }
  if (mode === "email" || mode === "both") {
    tasks.push((async () => {
      const { data, error } = await sb.auth.admin.getUserById(link.owner);
      const email = data?.user?.email;
      console.log("email lookup", { found: !!email, error: error?.message });
      if (email) {
        await sendEmail(email, link.name);
        console.log("email sent");
      }
    })().catch((e) => console.error("email failed", String(e))));
  }
  await Promise.all(tasks);
  return new Response("ok");
});
