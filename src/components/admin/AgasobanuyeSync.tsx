import { useEffect, useState } from "react";
import { toast } from "sonner";
import { importFinishedTransfers, scanAndSyncFilms } from "@/lib/agasobanuye-sync.functions";

/** Admin: one click scans new films, sends them to Streamtape, and auto-imports finished transfers. */
export function AgasobanuyeSync() {
  const [proxy, setProxy] = useState("");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [watching, setWatching] = useState(false);
  const [report, setReport] = useState<string[]>([]);

  useEffect(() => {
    if (!watching) return;
    const t = setInterval(async () => {
      try {
        const r = await importFinishedTransfers();
        if (r.imported) toast.success(`${r.imported} finished films added to the site`);
      } catch { /* try again next minute */ }
    }, 60_000);
    return () => clearInterval(t);
  }, [watching]);

  const run = async () => {
    setBusy(true);
    try {
      const r = await scanAndSyncFilms({ data: { proxyPrefix: proxy, rightsConfirmed: rights } });
      setReport([
        `Checked ${r.scanned} new films. Sent ${r.queued.length} to Streamtape, ${r.skipped} already had.`,
        `Added ${r.imported} finished films to the site.`,
        ...r.queued.map((n) => `Downloading: ${n}`),
        ...r.failed.map((n) => `Failed: ${n}`),
      ]);
      setWatching(true);
      toast.success("Update started. Finished films are added automatically.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 border-t border-border pt-6">
      <h3 className="font-bold">Update films from Agasobanuye</h3>
      <input value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="Optional proxy link, e.g. https://you.vercel.app/api/stream?url=" className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1" />
        I have permission from the owner to share these films on IBONA.
      </label>
      <button type="button" onClick={run} disabled={busy || !rights} className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {busy ? "Updating…" : "Update"}
      </button>
      {watching && <p className="text-sm text-muted-foreground">Keep this page open: finished films are added every minute.</p>}
      {report.map((l) => (
        <p key={l} className={l.startsWith("Failed") ? "text-sm text-destructive" : "text-sm"}>{l}</p>
      ))}
    </div>
  );
}
