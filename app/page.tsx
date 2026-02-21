"use client";

import { useMemo, useState } from "react";
import { getSeen, getSkipped, markSeen, toggleFavorite, skipVacancy } from "@/lib/db";
import { toHhUrl } from "@/lib/hh";
import type { SearchFilters, VacancyCard } from "@/lib/types";
import { useHhMeta } from "@/components/useHhMeta";

const initial: SearchFilters = { text: "" };

function salaryLabel(salary?: VacancyCard["salary"]) {
  if (!salary) return "Не указана";
  return `${salary.from ?? ""} - ${salary.to ?? ""} ${salary.currency ?? ""}`.trim();
}

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>(initial);
  const [vacancies, setVacancies] = useState<VacancyCard[]>([]);
  const [overflow, setOverflow] = useState<VacancyCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState(0);
  const { areas, dictionaries } = useHhMeta();

  const hhLink = useMemo(() => toHhUrl({
    text: filters.text,
    area: filters.area,
    salary: filters.salary_from,
    only_with_salary: filters.only_with_salary,
    experience: filters.experience,
    employment: filters.employment,
    schedule: filters.schedule
  }), [filters]);

  async function fetchTen(nextPage: number, baseFilters = filters) {
    setBusy(true);
    setError("");

    try {
      const seen = await getSeen(baseFilters);
      const skipped = await getSkipped();
      const collected: VacancyCard[] = overflow.filter((v) => !seen.has(v.id) && !skipped.has(v.id));
      let currentPage = nextPage;
      let pages = nextPage;
      const collectedIds = new Set(collected.map((v) => v.id));

      if (collected.length >= 10) {
        const top10 = collected.slice(0, 10);
        const rest = collected.slice(10);
        await markSeen(baseFilters, top10);
        setVacancies(top10);
        setOverflow(rest);
        return;
      }

      while (collected.length < 10) {
        const q = new URLSearchParams({
          text: baseFilters.text,
          page: String(currentPage),
          per_page: "20",
          ...(baseFilters.area ? { area: baseFilters.area } : {}),
          ...(baseFilters.salary_from ? { salary: baseFilters.salary_from } : {}),
          ...(baseFilters.only_with_salary ? { only_with_salary: "true" } : {}),
          ...(baseFilters.experience ? { experience: baseFilters.experience } : {}),
          ...(baseFilters.employment ? { employment: baseFilters.employment } : {}),
          ...(baseFilters.schedule ? { schedule: baseFilters.schedule } : {})
        });
        const res = await fetch(`/api/hh/search?${q.toString()}`);
        if (!res.ok) throw new Error(`HH API error ${res.status}`);
        const data = await res.json();
        pages = data.pages;
        const filtered = (data.items as VacancyCard[]).filter((v) => !seen.has(v.id) && !skipped.has(v.id) && !collectedIds.has(v.id));
        filtered.forEach((v) => collectedIds.add(v.id));
        collected.push(...filtered);
        currentPage += 1;
        if (currentPage >= pages || data.items.length === 0) break;
      }

      const top10 = collected.slice(0, 10);
      const rest = collected.slice(10);
      await markSeen(baseFilters, top10);
      setVacancies(top10);
      setOverflow(rest);
      setPage(currentPage);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">hh-keywords</h1>
      <div className="rounded bg-white p-4 shadow space-y-3">
        <input className="w-full rounded border p-2" placeholder="Query" value={filters.text} onChange={(e) => setFilters({ ...filters, text: e.target.value })} />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select className="rounded border p-2" value={filters.area ?? ""} onChange={(e) => setFilters({ ...filters, area: e.target.value || undefined })}>
            <option value="">Area</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input className="rounded border p-2" placeholder="salary_from" value={filters.salary_from ?? ""} onChange={(e) => setFilters({ ...filters, salary_from: e.target.value || undefined })} />
          <label className="flex items-center gap-2 rounded border p-2"><input type="checkbox" checked={filters.only_with_salary ?? false} onChange={(e) => setFilters({ ...filters, only_with_salary: e.target.checked })} />only_with_salary</label>
          <select className="rounded border p-2" value={filters.experience ?? ""} onChange={(e) => setFilters({ ...filters, experience: e.target.value || undefined })}>
            <option value="">experience</option>
            {dictionaries.experience?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select className="rounded border p-2" value={filters.employment ?? ""} onChange={(e) => setFilters({ ...filters, employment: e.target.value || undefined })}>
            <option value="">employment</option>
            {dictionaries.employment?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <select className="rounded border p-2" value={filters.schedule ?? ""} onChange={(e) => setFilters({ ...filters, schedule: e.target.value || undefined })}>
            <option value="">schedule</option>
            {dictionaries.schedule?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="rounded bg-blue-600 px-3 py-2 text-white" disabled={busy} onClick={() => { setPage(0); setOverflow([]); fetchTen(0); }}>Искать</button>
          <button className="rounded bg-slate-300 px-3 py-2" onClick={() => { setFilters(initial); setVacancies([]); setOverflow([]); setPage(0); }}>Сбросить</button>
          <a className="rounded bg-green-600 px-3 py-2 text-white" href={hhLink} target="_blank">Открыть этот поиск на hh.ru</a>
        </div>
        {error && <p className="text-red-600">{error}</p>}
      </div>

      <div className="space-y-3">
        {vacancies.map((v) => (
          <div key={v.id} className="rounded bg-white p-4 shadow">
            <h2 className="font-semibold">{v.name}</h2>
            <p>{v.employer?.name} · {v.area?.name}</p>
            <p>{salaryLabel(v.salary)} · {new Date(v.published_at).toLocaleDateString()}</p>
            <div className="mt-2 flex gap-2">
              <a href={v.alternate_url} target="_blank" className="text-blue-700 underline">Открыть на hh</a>
              <label className="flex items-center gap-1"><input type="checkbox" onChange={(e) => toggleFavorite(v, e.target.checked)} />В избранное</label>
              <button className="text-red-600" onClick={async () => { await skipVacancy(v.id); setVacancies((x) => x.filter((z) => z.id !== v.id)); }}>Пропустить</button>
            </div>
          </div>
        ))}
      </div>

      {vacancies.length > 0 && <button className="rounded bg-indigo-600 px-4 py-2 text-white" disabled={busy} onClick={() => fetchTen(page)}>Следующие 10</button>}
    </div>
  );
}
