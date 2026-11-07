import { useEffect, useState } from "react";
import { Download, Loader2, CheckCircle2 } from "lucide-react";

const AD_URL = "https://uplcm.com/4/11776802";
const WAIT_SECONDS = 5;

/** Turns a saved film link into a download page link (Streamtape /e/ → /v/). */
export function toDownloadUrl(src?: string | null): string | null {
  if (!src) return null;
  const m = src.match(/(streamtape\.[a-z]+|strtape\.[a-z]+|streamta\.pe)\/(?:e|v)\/([A-Za-z0-9]+)/i);
  if (m) return `https://streamtape.com/v/${m[2]}/`;
  if (/^https?:\/\//i.test(src)) return src;
  return null;
}

export function MonetizedDownloadButton({ src }: { src?: string | null }) {
  const url = toDownloadUrl(src);
  const [step, setStep] = useState<"idle" | "wait" | "ready">("idle");
  const [left, setLeft] = useState(WAIT_SECONDS);

  useEffect(() => {
    if (step !== "wait") return;
    if (left <= 0) { setStep("ready"); return; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, left]);

  if (!url) return null;

  const onClick = () => {
    if (step === "idle") {
      window.open(AD_URL, "_blank", "noopener,noreferrer");
      setLeft(WAIT_SECONDS);
      setStep("wait");
    } else if (step === "ready") {
      window.open(url, "_blank", "noopener,noreferrer");
      setStep("idle");
    }
  };

  const base = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition";
  if (step === "wait")
    return (
      <button disabled className={`${base} border border-border bg-surface opacity-80 cursor-wait`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Tegereza akanya ({left}s)
      </button>
    );
  if (step === "ready")
    return (
      <button onClick={onClick} className={`${base} bg-secondary text-secondary-foreground hover:opacity-90 animate-pulse`}>
        <CheckCircle2 className="h-4 w-4" /> Kanda hano ukuremo
      </button>
    );
  return (
    <button onClick={onClick} className={`${base} bg-primary text-primary-foreground hover:opacity-90`}>
      <Download className="h-4 w-4" /> Gukuramo Filime
    </button>
  );
}
