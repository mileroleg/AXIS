import React, { useEffect, useMemo, useState } from 'react';
import { loadYmaps3, NO_YMAPS_KEY, type Ymaps3Api } from '../lib/ymaps3Loader';

export type ServiceCenterMapItem = {
  id: string;
  name: string;
  geo: {
    lat: number;
    lng: number;
  };
};

type YMapViewProps = {
  center: [number, number];
  zoom?: number;
  serviceCenters?: ServiceCenterMapItem[];
  onOpenService?: (id: string) => void;
  onFallbackToList?: () => void;
};

type MapComponents = {
  YMap: React.ComponentType<any>;
  YMapDefaultSchemeLayer: React.ComponentType<any>;
  YMapDefaultFeaturesLayer: React.ComponentType<any>;
  YMapMarker: React.ComponentType<any>;
};

const mapContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '60vh',
  minHeight: 320,
  borderRadius: 16,
  overflow: 'hidden'
};

const pinStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: '999px',
  border: '2px solid white',
  background: '#2563eb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  cursor: 'pointer'
};

const resolveComponents = async (ymaps3: Ymaps3Api): Promise<MapComponents> => {
  const reactifyModule = await ymaps3.import('@yandex/ymaps3-reactify');
  const reactify = reactifyModule.reactify.bindTo(React, React);

  return reactify.module(ymaps3) as MapComponents;
};

export const YMapView: React.FC<YMapViewProps> = ({
  center,
  zoom = 11,
  serviceCenters = [],
  onOpenService,
  onFallbackToList
}) => {
  const [components, setComponents] = useState<MapComponents | null>(null);
  const [errorCode, setErrorCode] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setErrorCode('');
        const ymaps3 = await loadYmaps3();
        const next = await resolveComponents(ymaps3);
        if (isMounted) setComponents(next);
      } catch (error: any) {
        if (!isMounted) return;
        const code = error?.name || error?.message || 'YMAPS3_LOAD_ERROR';
        setErrorCode(String(code));
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const location = useMemo(
    () => ({ center, zoom }),
    [center, zoom]
  );

  if (errorCode === NO_YMAPS_KEY) {
    return (
      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: 'white' }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Карта отключена (нет ключа)</h3>
        <p style={{ marginTop: 8, color: '#475569', fontSize: 14 }}>
          Задайте VITE_YMAPS_API_KEY, чтобы включить Яндекс Карты.
        </p>
        <button
          type="button"
          onClick={onFallbackToList}
          style={{ marginTop: 12, minHeight: 48, width: '100%', borderRadius: 12, border: '1px solid #cbd5e1', background: 'white' }}
        >
          Перейти к списку
        </button>
      </section>
    );
  }

  if (!components) {
    return (
      <section style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: 'white' }}>
        <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>Загрузка карты…</p>
      </section>
    );
  }

  const { YMap, YMapDefaultFeaturesLayer, YMapDefaultSchemeLayer, YMapMarker } = components;

  return (
    <div style={mapContainerStyle}>
      <YMap location={location} mode="vector">
        <YMapDefaultSchemeLayer />
        <YMapDefaultFeaturesLayer />
        {serviceCenters.map((centerItem) => (
          <YMapMarker key={centerItem.id} coordinates={[centerItem.geo.lng, centerItem.geo.lat]}>
            <button
              type="button"
              title={centerItem.name}
              style={pinStyle}
              onClick={() => onOpenService?.(centerItem.id)}
            />
          </YMapMarker>
        ))}
      </YMap>
    </div>
  );
};

export default YMapView;
