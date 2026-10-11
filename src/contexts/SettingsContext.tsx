import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SettingsContextValue {
  lowData: boolean;
  setLowData: (v: boolean) => void;
  /** True if the device reports a slow connection (2g/slow-2g) or saveData is on */
  slowConnection: boolean;
  /** Effective: low-data is on OR connection is slow */
  shouldReducePreviews: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);
const STORAGE_KEY = "ibona.lowData";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lowData, setLowDataState] = useState(false);
  const [slowConnection, setSlowConnection] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setLowDataState(true);
    } catch {
      /* ignore */
    }
    // Connection-aware
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
        addEventListener?: (e: string, fn: () => void) => void;
        removeEventListener?: (e: string, fn: () => void) => void;
      };
    };
    const conn = nav.connection;
    const update = () => {
      if (!conn) return;
      const slow =
        !!conn.saveData ||
        conn.effectiveType === "slow-2g" ||
        conn.effectiveType === "2g" ||
        conn.effectiveType === "3g";
      setSlowConnection(slow);
    };
    update();
    conn?.addEventListener?.("change", update);
    return () => conn?.removeEventListener?.("change", update);
  }, []);

  const setLowData = (v: boolean) => {
    setLowDataState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        lowData,
        setLowData,
        slowConnection,
        shouldReducePreviews: lowData || slowConnection,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
