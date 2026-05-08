/** Local calendar day as YYYY-MM-DD */
export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Human-readable label for a YYYY-MM-DD day key (local calendar). */
export function formatDayKeyLabel(key: string): string {
  try {
    const d = parseDayKey(key);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return key;
  }
}

/** Long date heading for archive lists, e.g. “May 22, 2011”. */
export function formatDayKeyArchiveHeading(key: string): string {
  try {
    const d = parseDayKey(key);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return key;
  }
}

/** Whole local days from anchor day (inclusive) to target (inclusive) — anchor should be <= target */
export function wholeLocalDaysBetween(anchorDayKey: string, targetDayKey: string): number {
  const a = parseDayKey(anchorDayKey).setHours(0, 0, 0, 0);
  const t = parseDayKey(targetDayKey).setHours(0, 0, 0, 0);
  return Math.round((t - a) / 86_400_000);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic index in [0, mod) from a seed string */
export function seededSlot(seed: string, mod: number): number {
  if (mod <= 0) return 0;
  return hashString(seed) % mod;
}
