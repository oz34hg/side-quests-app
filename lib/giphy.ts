/** Giphy hostnames we accept when storing chat GIF URLs (must match Firestore rules). */
export function isAllowedGiphyUrl(url: string): boolean {
  const t = url.trim();
  if (!t.startsWith('https://')) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'i.giphy.com') return true;
    if (h.endsWith('.giphy.com')) return true;
    return false;
  } catch {
    return false;
  }
}

export type GiphyGif = {
  id: string;
  /** Full GIF URL suitable for chat */
  url: string;
  previewUrl: string;
  width: number;
  height: number;
};

type GiphySearchResponse = {
  data?: Array<{
    id: string;
    images?: {
      fixed_height?: { url?: string; width?: string; height?: string };
      downsized_medium?: { url?: string; width?: string; height?: string };
      fixed_width_small?: { url?: string; width?: string; height?: string };
    };
  }>;
};

export function getGiphyApiKey(): string | undefined {
  const k = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
  return typeof k === 'string' && k.trim() ? k.trim() : undefined;
}

/** Search trending when query is empty. */
export async function searchGiphy(query: string, limit = 24): Promise<GiphyGif[]> {
  const apiKey = getGiphyApiKey();
  if (!apiKey) return [];

  const q = query.trim();
  const path = q
    ? `search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`
    : `trending?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&rating=pg-13`;

  const res = await fetch(`https://api.giphy.com/v1/gifs/${path}`);
  if (!res.ok) return [];

  const json = (await res.json()) as GiphySearchResponse;
  const rows = json.data ?? [];

  const out: GiphyGif[] = [];
  for (const row of rows) {
    const img = row.images?.fixed_height ?? row.images?.downsized_medium;
    const prev = row.images?.fixed_width_small;
    const url = img?.url?.replace(/^http:/, 'https:');
    if (!url || !isAllowedGiphyUrl(url)) continue;
    const previewUrl = (prev?.url ?? img?.url)?.replace(/^http:/, 'https:') ?? url;
    const w = Number(img?.width) || 200;
    const h = Number(img?.height) || 200;
    out.push({
      id: row.id,
      url,
      previewUrl,
      width: w,
      height: h,
    });
  }
  return out;
}
