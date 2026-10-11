export function IbonaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-8 w-8 rounded-lg" style={{ background: "var(--gradient-brand)" }}>
        <div className="absolute inset-0 flex items-center justify-center text-base font-black text-background">
          ◉
        </div>
      </div>
      <span
        className="text-xl font-black tracking-tight bg-clip-text text-transparent"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        IBONA
      </span>
    </div>
  );
}
