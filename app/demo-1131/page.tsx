'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { FeatureCollection } from 'geojson';

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
        const sumArea = (fc: FeatureCollection) =>
          fc.features.reduce((acc, f) => acc + turf.area(f), 0);

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

            // Görünüm: admin bbox'a uydur
            const bbox = turf.bbox(adminFC) as [number, number, number, number];
            map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 500 });
          });
        }
      } catch (e: unknown) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="text-sm text-gray-500">
                <Link href="/" className="hover:text-gray-700">Home</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">SDG 11.3.1 Demo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SDG 11.3.1 Analysis</h1>
              <p className="text-lg text-gray-600">Land Consumption Rate vs Population Growth Rate</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              This demo analyzes <strong>built-up</strong> area change (t→t+n) using synthetic data and 
              computes the <strong>LCR / PGR</strong> ratios. Maps and metrics are updated in real time.<br />
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Map Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Interactive Map</h2>
              <p className="text-sm text-gray-600">Built-up areas and administrative boundaries</p>
            </div>
            <div 
              ref={containerRef} 
              className="w-full"
              style={{ height: '500px' }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Analysis Results</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics?.map((m) => {
              const isRatio = m.label.includes('LCR / PGR');
              const isRate = m.label.includes('yr⁻¹');
              const isArea = m.label.includes('area');
              
              let cardColor = 'border-gray-200 bg-white';
              let iconColor = 'text-gray-600 bg-gray-100';
              let valueColor = 'text-gray-900';
              
              if (isRatio) {
                cardColor = 'border-purple-200 bg-purple-50';
                iconColor = 'text-purple-600 bg-purple-100';
                valueColor = 'text-purple-900';
              } else if (isRate) {
                cardColor = 'border-blue-200 bg-blue-50';
                iconColor = 'text-blue-600 bg-blue-100';
                valueColor = 'text-blue-900';
              } else if (isArea) {
                cardColor = 'border-green-200 bg-green-50';
                iconColor = 'text-green-600 bg-green-100';
                valueColor = 'text-green-900';
              }

              return (
                <div key={m.label} className={`border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${cardColor}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
                      {isArea ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      ) : isRate ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                    {m.label}
                  </div>
                  <div className={`text-2xl font-bold ${valueColor}`}>
                    {m.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Calculation Notes</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>LCR:</strong> ln(Urb<sub>t+n</sub>/Urb<sub>t</sub>)/n</p>
              <p><strong>PGR:</strong> ln(Pop<sub>t+n</sub>/Pop<sub>t</sub>)/n</p>
              <p className="text-amber-600 font-medium">⚠️ Veriler sentetiktir ve demo amaçlıdır.</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Map Attribution</h3>
            <div className="text-sm text-gray-600">
              <p>© OpenStreetMap contributors</p>
              <p>Style: MapLibre demo tiles</p>
              <p>Built-up data: Synthetic GeoJSON</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
