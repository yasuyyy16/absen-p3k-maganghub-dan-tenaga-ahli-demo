'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface AttendanceMapProps {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  address?: string | null;
  title?: string;
  heightClass?: string;
}

export default function AttendanceMap({
  latitude,
  longitude,
  accuracy,
  address,
  title = 'Lokasi Presensi',
  heightClass = 'h-48 sm:h-64',
}: AttendanceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom SVG Marker Icon for Institutional Clarity
      const customIcon = L.divIcon({
        className: 'custom-attendance-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 28px; height: 28px; background: rgba(0, 97, 148, 0.2); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 24px; height: 24px; background: #006194; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      markerRef.current = marker;

      const popupContent = `
        <div style="font-family: var(--font-inter, sans-serif); font-size: 12px; padding: 2px;">
          <strong style="color: #006194; display: block; margin-bottom: 2px;">${title}</strong>
          <span style="color: #475569; font-size: 11px; display: block;">${address || 'Titik Koordinat GPS'}</span>
          <span style="color: #64748b; font-family: monospace; font-size: 10px; margin-top: 4px; display: block;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
        </div>
      `;
      marker.bindPopup(popupContent);

      if (typeof accuracy === 'number' && accuracy > 0 && accuracy < 500) {
        const circle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#006194',
          fillColor: '#006194',
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(map);
        circleRef.current = circle;
      }

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // Update marker, circle, and pan map smoothly when lat/lng/accuracy changes in realtime
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const newLatLng = L.latLng(latitude, longitude);
    marker.setLatLng(newLatLng);

    const popupContent = `
      <div style="font-family: var(--font-inter, sans-serif); font-size: 12px; padding: 2px;">
        <strong style="color: #006194; display: block; margin-bottom: 2px;">${title}</strong>
        <span style="color: #475569; font-size: 11px; display: block;">${address || 'Titik Koordinat GPS'}</span>
        <span style="color: #64748b; font-family: monospace; font-size: 10px; margin-top: 4px; display: block;">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
      </div>
    `;
    marker.setPopupContent(popupContent);

    // Update accuracy circle
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
    if (typeof accuracy === 'number' && accuracy > 0 && accuracy < 500) {
      const circle = L.circle(newLatLng, {
        radius: accuracy,
        color: '#006194',
        fillColor: '#006194',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);
      circleRef.current = circle;
    }

    map.panTo(newLatLng, { animate: true });
  }, [latitude, longitude, accuracy, address, title]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-2xs">
      <div
        ref={mapContainerRef}
        className={`w-full ${heightClass} z-0`}
        style={{ minHeight: '180px' }}
      />
    </div>
  );
}
