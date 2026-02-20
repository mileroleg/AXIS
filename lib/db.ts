"use client";

import { openDB } from "idb";
import { SearchFilters, StoredVacancy, VacancyCard } from "@/lib/types";

const DB_NAME = "hh-keywords-db";

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore("favorites", { keyPath: "id" });
      database.createObjectStore("seen", { keyPath: "key" });
      database.createObjectStore("skipped", { keyPath: "id" });
      database.createObjectStore("state", { keyPath: "key" });
      database.createObjectStore("overrides", { keyPath: "term" });
    }
  });
}

export function filtersKey(filters: SearchFilters) {
  return JSON.stringify(filters);
}

export async function markSeen(filters: SearchFilters, vacancies: VacancyCard[]) {
  const d = await db();
  const key = filtersKey(filters);
  const previous = (await d.get("seen", key))?.ids ?? [];
  const merged = Array.from(new Set([...previous, ...vacancies.map((v) => v.id)]));
  await d.put("seen", { key, ids: merged });
}

export async function getSeen(filters: SearchFilters): Promise<Set<string>> {
  const d = await db();
  const res = await d.get("seen", filtersKey(filters));
  return new Set((res?.ids ?? []) as string[]);
}

export async function toggleFavorite(vacancy: VacancyCard, checked: boolean) {
  const d = await db();
  if (checked) await d.put("favorites", vacancy);
  else await d.delete("favorites", vacancy.id);
}

export async function listFavorites(): Promise<StoredVacancy[]> {
  const d = await db();
  return d.getAll("favorites");
}

export async function skipVacancy(id: string) {
  const d = await db();
  await d.put("skipped", { id });
}

export async function getSkipped(): Promise<Set<string>> {
  const d = await db();
  const all = await d.getAllKeys("skipped");
  return new Set(all as string[]);
}

export async function saveOverride(term: string, category: "tools" | "soft" | "hard") {
  const d = await db();
  await d.put("overrides", { term: term.toLowerCase(), category });
}

export async function getOverrides(): Promise<Record<string, "tools" | "soft" | "hard">> {
  const d = await db();
  const all = await d.getAll("overrides");
  return all.reduce((acc, cur) => {
    acc[cur.term] = cur.category;
    return acc;
  }, {} as Record<string, "tools" | "soft" | "hard">);
}
