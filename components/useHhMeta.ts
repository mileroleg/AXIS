"use client";

import { useEffect, useState } from "react";

type Option = { id: string; name: string };

type Dicts = {
  experience?: Option[];
  employment?: Option[];
  schedule?: Option[];
};

export function useHhMeta() {
  const [areas, setAreas] = useState<Option[]>([]);
  const [dictionaries, setDictionaries] = useState<Dicts>({});

  useEffect(() => {
    fetch("/api/hh/areas")
      .then((r) => r.json())
      .then((res) => {
        const top = (res as Array<{ id: string; name: string }>).slice(0, 300);
        setAreas(top);
      })
      .catch(() => setAreas([]));

    fetch("/api/hh/dictionaries")
      .then((r) => r.json())
      .then((res) => setDictionaries(res))
      .catch(() => setDictionaries({}));
  }, []);

  return { areas, dictionaries };
}
