'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

type PopPayload = {
  t: number;
  t_n: number;
  population_t: number;
  population_tn: number;
};

type AreaStats = {
  area_t_m2: number;
  area_tn_m2: number;
  years: number;
  lcr: number | null;
  pgr: number | null;
  ratio: number | null; // LCR / PGR
};

function fmt(n: number, maxFrac = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: maxFrac }).format(n);
}

export default function Demo1131Page() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [stats, setStats] = useState<AreaStats | null>(null);
  const [meta, setMeta] = useState<PopPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Basit LCR/PGR hesapları (ln oran / yıl)
  function computeRates(areaT: number, areaTN: number, pop: PopPayload): AreaStats {
    const years = Math.max(1, pop.t_n - pop.t);
    const lcr = areaT > 0 && areaTN > 0 ? Math.log(areaTN / areaT) / years : null;
    const pgr = pop.population_t > 0 && pop.population_tn > 0 ? Math.log(pop.population_tn / pop.population_t) / years : null;
    const ratio = lcr !== null && pgr !== null && pgr !== 0 ? lcr / pgr : null;
    return { area_t_m2: areaT, area_tn_m2: areaTN, years, lcr, pgr, ratio };
  }

  useEffect(() => {
    (async () => {
      try {
        // Verileri çek
        const [tRes, tnRes, adminRes, popRes] = await Promise.all([
          fetch('/data/built_up_t.geojson'),
          fetch('/data/built_up_tn.geojson'),
          fetch('/data/admin_unit.geojson'),
          fetch('/data/populations.json'),
        ]);

        const [tFC, tnFC, adminFC, pop] = await Promise.all([
          tRes.json(),
          tnRes.json(),
          adminRes.json(),
          popRes.json(),
        ]);

        setMeta(pop as PopPayload);

        // Alan hesapla (m²) — FeatureCollection içindeki tüm poligonların toplamı
        const sumArea = (fc: any) =>
          (fc.features as any[]).reduce((acc, f) => acc + turf.area(f), 0);

        const areaT = sumArea(tFC);
        const areaTN = sumArea(tnFC);
        const statsObj = computeRates(areaT, areaTN, pop as PopPayload);
        setStats(statsObj);

        // Haritayı başlat
        if (containerRef.current) {
          const map = new maplibregl.Map({
            container: containerRef.current,
            style: 'https://demotiles.maplibre.org/style.json',
            center: [29.03, 41.02],
            zoom: 12,
          });

          mapRef.current = map;

          map.on('load', () => {
            // Admin sınırı
            map.addSource('admin', { type: 'geojson', data: adminFC });
            map.addLayer({
              id: 'admin-line',
              type: 'line',
              source: 'admin',
              paint: { 'line-color': '#000000', 'line-width': 1.5, 'line-dasharray': [2, 2] }
            });

            // Built-up t
            map.addSource('built_t', { type: 'geojson', data: tFC });
            map.addLayer({
              id: 'built_t_fill',
              type: 'fill',
              source: 'built_t',
              paint: { 'fill-color': '#1f77b4', 'fill-opacity': 0.35 }
            });
            map.addLayer({
              id: 'built_t_line',
              type: 'line',
              source: 'built_t',
              paint: { 'line-color': '#1f77b4', 'line-width': 1 }
            });

            // Built-up t+n
            map.addSource('built_tn', { type: 'geojson', data: tnFC });
            map.addLayer({
              id: 'built_tn_fill',
              type: 'fill',
              source: 'built_tn',
              paint: { 'fill-color': '#d62728', 'fill-opacity': 0.30 }
            });
            map.addLayer({
              id: 'built_tn_line',
              type: 'line',
              source: 'built_tn',
              paint: { 'line-color': '#d62728', 'line-width': 1 }
            });

            // Görünüm: admin bbox’a uydur
            const bbox = turf.bbox(adminFC as any) as [number, number, number, number];
            map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 500 });
          });
        }
      } catch (e: any) {
        console.error(e);
        setError('Demo verisi yüklenirken sorun oluştu.');
      }
    })();

    return () => {
      // Unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const metrics = useMemo(() => {
    if (!stats || !meta) return null;
    return [
      { label: `Built‑up area @ t (${meta.t})`, value: `${fmt(stats.area_t_m2, 0)} m²` },
      { label: `Built‑up area @ t+n (${meta.t_n})`, value: `${fmt(stats.area_tn_m2, 0)} m²` },
      { label: `Years (n)`, value: `${stats.years}` },
      { label: `LCR (yr⁻¹)`, value: stats.lcr !== null ? fmt(stats.lcr, 6) : '—' },
      { label: `PGR (yr⁻¹)`, value: stats.pgr !== null ? fmt(stats.pgr, 6) : '—' },
      { label: `LCR / PGR`, value: stats.ratio !== null ? fmt(stats.ratio, 4) : '—' }
    ];
  }, [stats, meta]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">SDG 11.3.1 — Minimal Demo</h1>
      <p className="text-sm text-gray-600">
        Sentetik verilerle (GeoJSON) <strong>built‑up</strong> alanı değişimi (t→t+n) ve nüfusla
        <strong> LCR / PGR</strong> hesaplarını gösterir. Harita yalnızca bağlam içindir.
      </p>

      {error && <div className="text-red-600">{error}</div>}

      <div ref={containerRef} style={{ height: '60vh', borderRadius: 8, overflow: 'hidden' }} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics?.map((m) => (
          <div key={m.label} className="border rounded-md p-3">
            <div className="text-xs uppercase text-gray-500">{m.label}</div>
            <div className="text-lg font-medium">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        Notes: LCR = ln(Urb<sub>t+n</sub>/Urb<sub>t</sub>)/n, PGR = ln(Pop<sub>t+n</sub>/Pop<sub>t</sub>)/n. Veri sentetiktir.
      </div>

      <div className="text-xs text-gray-500">
        Map © OpenStreetMap contributors • Style: MapLibre demo
      </div>
    </div>
  );
}
