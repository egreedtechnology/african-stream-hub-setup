import { useEffect, useState } from "react";
import { toast } from "sonner";
import { syncDaddymFilms } from "@/lib/daddym-sync.functions";
import { importFinishedTransfers } from "@/lib/agasobanuye-sync.functions";

/** Admin: sends Daddy M Films (MediaFire) to Streamtape, then auto-imports finished films. */
export function DaddymSync() {
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [watching, setWatching] = useState(false);
  const [report, setReport] = useState<string[]>([]);

  useEffect(() => {
    if (!watching) return;
    const t = setInterval(async () => {
      try {
        const r = await importFinishedTransfers();
        if (r.imported) toast.success(`${r.imported} finished films added to the site`);
      } catch { /* retry next minute */ }
    }, 60_000);
    return () => clearInterval(t);
  }, [watching]);

  const run = async () => {
    setBusy(true);
    try {
      const r = await syncDaddymFilms({ data: { rightsConfirmed: rights, offset, limit: 10 } });
      setOffset(r.done ? 0 : r.nextOffset);
      setReport([
        `Checked ${r.scanned} films. Sent ${r.queued.length} files to Streamtape, ${r.skipped} already on the site.`,
        r.done ? "Reached the end of the Daddy M list." : "Click again for the next 10 films.",
        ...r.queued.map((n) => `Downloading: ${n}`),
        ...r.failed.map((n) => `Failed: ${n}`),
      ]);
      setWatching(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-3 border-t border-border pt-6">
      <h3 className="font-bold">Update films from Daddy M Films</h3>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1" />
        I have permission from Daddy M Films to share these films on IBONA.
      </label>
      <button type="button" onClick={run} disabled={busy || !rights} className="rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {busy ? "Updating…" : offset ? `Continue (from film ${offset + 1})` : "Update"}
      </button>
      {watching && <p className="text-sm text-muted-foreground">Keep this page open: finished films are added every minute.</p>}
      {report.map((l) => (
        <p key={l} className={l.startsWith("Failed") ? "text-sm text-destructive" : "text-sm"}>{l}</p>
      ))}
    </div>
  );
}
