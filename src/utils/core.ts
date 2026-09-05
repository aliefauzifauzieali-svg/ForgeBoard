export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_à-ú]/gi, ''))
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 12);
}
