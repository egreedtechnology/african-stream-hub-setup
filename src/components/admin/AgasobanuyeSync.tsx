import { useState } from "react";
import { toast } from "sonner";
import { sendToStreamtape } from "@/lib/agasobanuye-sync.functions";

/** Admin: paste film links; Streamtape downloads them into your account. Then use "Import all Streamtape videos". */
export function AgasobanuyeSync() {
  const [urls, setUrls] = useState("");
  const [proxy, setProxy] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ url: string; ok: boolean; msg: string }[]>([]);
  const run = async () => {
    setBusy(true);
    try {
      const res = await sendToStreamtape({ data: { urls: urls.split(/\s+/), proxyPrefix: proxy } });
      setLog(res.results);
      toast.success(`${res.results.filter((r) => r.ok).length} films sent to Streamtape`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-6 space-y-3 border-t border-border pt-6">
      <h3 className="font-bold">Update films from Agasobanuye</h3>
      <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={4} placeholder="Paste film links (one per line)" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
      <input value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="Optional proxy link, e.g. https://you.vercel.app/api/stream?url=" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
      <button type="button" onClick={run} disabled={busy || !urls.trim()} className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {busy ? "Sending…" : "Update"}
      </button>
      {log.map((r) => (
        <p key={r.url} className={r.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{r.msg}: {r.url}</p>
      ))}
    </div>
  );
}
