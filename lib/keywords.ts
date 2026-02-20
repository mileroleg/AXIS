import { SOFT_DICTIONARY } from "@/lib/soft_dictionary";
import { TOOLS_DICTIONARY } from "@/lib/tools_dictionary";

const STOP_WORDS = new Set([
  "и","в","во","на","с","со","по","для","что","как","или","а","но","мы","вы","ты","к","из","от","до","под","над","при",
  "the","a","an","to","for","of","on","in","with","and","or","is","are","be","will","you","your","our","we"
]);

const NOISE_SECTIONS = ["мы предлагаем", "будет плюсом", "условия", "что предлагаем", "о компании"];

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(term: string) {
  return term.toLowerCase().replace(/\s+/g, " ").trim();
}

export function extractKeyPhrases(text: string): string[] {
  const chunks = text
    .split(/[.!?\n;:]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !NOISE_SECTIONS.some((noise) => line.toLowerCase().includes(noise)));

  const phrases: string[] = [];

  chunks.forEach((line) => {
    const tokens = line.split(/\s+/);
    let bucket: string[] = [];

    tokens.forEach((tokenRaw) => {
      const token = tokenRaw.toLowerCase().replace(/[^\p{L}\p{N}#+.-]/gu, "");
      if (!token || token.length < 2 || STOP_WORDS.has(token)) {
        if (bucket.length >= 2) {
          phrases.push(bucket.join(" "));
        }
        bucket = [];
      } else {
        bucket.push(tokenRaw.replace(/\s+/g, " "));
      }
    });

    if (bucket.length >= 2) {
      phrases.push(bucket.join(" "));
    }
  });

  return Array.from(new Set(phrases.map((p) => p.replace(/\s+/g, " ").trim()))).slice(0, 300);
}

export function aggregateTerms(terms: string[]) {
  const map = new Map<string, { term: string; count: number }>();

  terms.forEach((term) => {
    const clean = term.trim();
    if (!clean) return;
    const key = normalize(clean);
    const prev = map.get(key);
    if (prev) {
      prev.count += 1;
    } else {
      map.set(key, { term: clean, count: 1 });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
}

export function categorizeTerm(term: string, overrides?: Record<string, "tools" | "soft" | "hard">) {
  const n = normalize(term);
  if (overrides?.[n]) return overrides[n];
  if (TOOLS_DICTIONARY.some((t) => n.includes(t))) return "tools";
  if (SOFT_DICTIONARY.some((s) => n.includes(s))) return "soft";
  return "hard";
}
