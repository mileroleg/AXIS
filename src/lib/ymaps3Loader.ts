export const NO_YMAPS_KEY = 'NO_YMAPS_KEY';

declare global {
  interface Window {
    ymaps3?: {
      ready: Promise<void>;
      import: (moduleName: string) => Promise<any>;
    };
  }
}

export type Ymaps3Api = NonNullable<Window['ymaps3']>;

let loaderPromise: Promise<Ymaps3Api> | null = null;

const readApiKey = (): string => {
  const key = (globalThis as any)?.__AXIOS_YMAPS_API_KEY__ ?? (globalThis as any)?.import?.meta?.env?.VITE_YMAPS_API_KEY;
  return String(key || '').trim();
};

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ymaps3="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('YMAPS3_SCRIPT_ERROR')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.ymaps3 = '1';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('YMAPS3_SCRIPT_ERROR')), { once: true });
    document.head.appendChild(script);
  });

export const loadYmaps3 = async (): Promise<Ymaps3Api> => {
  if (window.ymaps3) {
    await window.ymaps3.ready;
    return window.ymaps3;
  }

  if (loaderPromise) return loaderPromise;

  const apiKey = readApiKey();
  if (!apiKey) {
    const error = new Error(NO_YMAPS_KEY);
    error.name = NO_YMAPS_KEY;
    throw error;
  }

  const src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;

  loaderPromise = (async () => {
    await loadScript(src);
    if (!window.ymaps3) throw new Error('YMAPS3_UNAVAILABLE');
    await window.ymaps3.ready;
    return window.ymaps3;
  })();

  return loaderPromise;
};
