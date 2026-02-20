"use client";

import { useState } from "react";
import { categorizeTerm, extractKeyPhrases, htmlToText, aggregateTerms } from "@/lib/keywords";
import { getOverrides, listFavorites, saveOverride } from "@/lib/db";
import { SummaryResult } from "@/lib/types";

function section(title: string, rows: { term: string; count: number }[]) {
  return `## ${title}\n${rows.map((r) => `- ${r.term} — ${r.count}`).join("\n")}\n`;
}

function buildMarkdown(summary: SummaryResult) {
  return `# hh-keywords summary\nGenerated: ${new Date().toLocaleString()}\n\n${section("Tools", summary.tools)}\n${section("Hard", summary.hard)}\n${section("Soft", summary.soft)}\n${section("Key skills (HH)", summary.hhKeySkills)}`;
}

export default function SummaryPage() {
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState("");

  async function collect() {
    setError("");
    try {
      const favorites = await listFavorites();
      const overrides = await getOverrides();
      const allPhrases: string[] = [];
      const hhSkills: string[] = [];

      for (const f of favorites) {
        const res = await fetch(`/api/hh/vacancy/${f.id}`);
        if (!res.ok) continue;
        const data = await res.json();
        const text = htmlToText(data.description ?? "");
        allPhrases.push(...extractKeyPhrases(text));
        hhSkills.push(...(data.key_skills ?? []).map((k: { name: string }) => k.name));
      }

      const grouped = { tools: [] as string[], hard: [] as string[], soft: [] as string[] };
      allPhrases.forEach((term) => grouped[categorizeTerm(term, overrides)].push(term));

      setSummary({
        tools: aggregateTerms(grouped.tools),
        hard: aggregateTerms(grouped.hard),
        soft: aggregateTerms(grouped.soft),
        hhKeySkills: aggregateTerms(hhSkills)
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function exportMarkdown() {
    if (!summary) return;
    const blob = new Blob([buildMarkdown(summary)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hh-keywords-summary.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportGoogleDocs() {
    if (!summary) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("NEXT_PUBLIC_GOOGLE_CLIENT_ID не задан. Используйте экспорт .md");
      return;
    }

    const g = (window as Window & { google?: any }).google;
    if (!g?.accounts?.oauth2) {
      setError("Google Identity Services не загружен");
      return;
    }

    const token = await new Promise<string>((resolve, reject) => {
      const tokenClient = g.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/documents",
        callback: (resp: { access_token?: string; error?: string }) => {
          if (resp.error || !resp.access_token) reject(new Error(resp.error ?? "No token"));
          else resolve(resp.access_token);
        }
      });
      tokenClient.requestAccessToken();
    });

    const docResp = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title: `hh-keywords ${new Date().toLocaleString()}` })
    });

    const doc = await docResp.json();
    const markdown = buildMarkdown(summary);

    await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: 1 }, text: markdown } }]
      })
    });

    window.open(`https://docs.google.com/document/d/${doc.documentId}/edit`, "_blank");
  }

  async function moveTerm(term: string, category: "tools" | "soft" | "hard") {
    await saveOverride(term, category);
    await collect();
  }

  return (
    <div className="space-y-4">
      <script src="https://accounts.google.com/gsi/client" async defer />
      <h1 className="text-2xl font-bold">Summary</h1>
      <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={collect}>Собрать ключевики</button>
      {error && <p className="text-red-600">{error}</p>}
      {summary && (
        <>
          <div className="flex gap-2">
            <button className="rounded bg-green-600 px-3 py-2 text-white" onClick={exportGoogleDocs}>Экспорт в Google Docs</button>
            <button className="rounded bg-slate-600 px-3 py-2 text-white" onClick={exportMarkdown}>Экспорт .md</button>
          </div>
          {(["tools", "hard", "soft", "hhKeySkills"] as const).map((name) => (
            <div key={name} className="rounded bg-white p-4 shadow">
              <h2 className="mb-2 text-lg font-semibold">{name}</h2>
              <ul className="space-y-1">
                {summary[name].map((item) => (
                  <li key={`${name}-${item.term}`} className="flex items-center justify-between gap-2">
                    <span>{item.term} — {item.count}</span>
                    {name !== "hhKeySkills" && (
                      <select className="rounded border p-1" defaultValue={name} onChange={(e) => moveTerm(item.term, e.target.value as "tools" | "soft" | "hard") }>
                        <option value="tools">tools</option>
                        <option value="hard">hard</option>
                        <option value="soft">soft</option>
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
