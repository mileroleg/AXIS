"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listFavorites, toggleFavorite } from "@/lib/db";
import { StoredVacancy } from "@/lib/types";

export default function FavoritesPage() {
  const [items, setItems] = useState<StoredVacancy[]>([]);

  useEffect(() => {
    listFavorites().then(setItems);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Favorites</h1>
      <Link href="/summary" className="rounded bg-blue-600 px-3 py-2 text-white inline-block">Собрать ключевики</Link>
      {items.map((v) => (
        <div key={v.id} className="rounded bg-white p-4 shadow">
          <h2 className="font-semibold">{v.name}</h2>
          <p>{v.employer?.name}</p>
          <button className="text-red-600" onClick={async () => {
            await toggleFavorite(v, false);
            setItems((x) => x.filter((y) => y.id !== v.id));
          }}>Удалить</button>
        </div>
      ))}
    </div>
  );
}
