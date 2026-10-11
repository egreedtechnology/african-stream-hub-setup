import { supabase } from "@/integrations/supabase/client";

const SETTINGS_TABLE = "app_settings";
const LOGIN_KEY = "streamtape_login";
const API_KEY = "streamtape_key";

export interface StreamtapeCredentials {
  login: string;
  key: string;
}

type SettingRow = { key: string; value: string | null };
type StreamtapeApiResponse = {
  status?: number;
  msg?: string;
  result?: { url?: string; id?: string; file_id?: string; signup_at?: string | number };
};

/** Load database credentials first, falling back to build-time environment values. */
export async function getStreamtapeCredentials(): Promise<StreamtapeCredentials> {
  const fallback = {
    login: String(import.meta.env.VITE_STREAMTAPE_LOGIN ?? "").trim(),
    key: String(import.meta.env.VITE_STREAMTAPE_KEY ?? "").trim(),
  };
  try {
    const { data, error } = await (supabase as any)
      .from(SETTINGS_TABLE)
      .select("key, value")
      .in("key", [LOGIN_KEY, API_KEY]);
    if (error) return fallback;
    const rows = (data as SettingRow[] | null) ?? [];
    const stored = Object.fromEntries(rows.map((row) => [row.key, row.value ?? ""]));
    return {
      login: String(stored[LOGIN_KEY] || fallback.login).trim(),
      key: String(stored[API_KEY] || fallback.key).trim(),
    };
  } catch {
    return fallback;
  }
}

function requireCredentials(credentials: StreamtapeCredentials) {
  if (!credentials.login || !credentials.key) throw new Error("Streamtape API login or key is not configured.");
}

export async function uploadToStreamtape(file: File): Promise<string> {
  const credentials = await getStreamtapeCredentials();
  requireCredentials(credentials);
  const params = new URLSearchParams({ login: credentials.login, key: credentials.key });
  const targetResponse = await fetch(`https://api.streamtape.com/file/ul?${params}`);
  const targetBody = (await targetResponse.json()) as StreamtapeApiResponse;
  const uploadUrl = targetBody.result?.url;
  if (!targetResponse.ok || targetBody.status !== 200 || !uploadUrl) {
    throw new Error(`Failed to get Streamtape upload URL: ${targetBody.msg || targetResponse.statusText}`);
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  const uploadResponse = await fetch(uploadUrl, { method: "POST", body: formData });
  const uploadBody = (await uploadResponse.json()) as StreamtapeApiResponse;
  const fileId = uploadBody.result?.file_id || uploadBody.result?.id;
  if (!uploadResponse.ok || uploadBody.status !== 200 || !fileId) {
    throw new Error(`Failed to upload file to Streamtape: ${uploadBody.msg || uploadResponse.statusText}`);
  }
  return `https://streamtape.com/e/${encodeURIComponent(fileId)}/`;
}

export async function verifyStreamtapeCredentials(credentials: StreamtapeCredentials) {
  requireCredentials(credentials);
  const params = new URLSearchParams(credentials);
  const response = await fetch(`https://api.streamtape.com/account/info?${params}`);
  const body = (await response.json()) as StreamtapeApiResponse;
  return response.status === 200 && body.status === 200 && Boolean(body.result?.signup_at);
}
