import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Waterloo Region centre
const KW_CENTER = [43.4516, -80.4925];
const KW_ZOOM = 12;

// Placeholder pothole data until real data is wired in
const PLACEHOLDER_POTHOLES = [
  { id: 1, lat: 43.4516, lng: -80.4925, severity: "high", address: "King St & University Ave" },
  { id: 2, lat: 43.4652, lng: -80.5222, severity: "medium", address: "Weber St N, Waterloo" },
  { id: 3, lat: 43.3601, lng: -80.3123, severity: "low", address: "Hespeler Rd, Cambridge" },
];

const SEVERITY_COLOR = { high: "#ef4444", medium: "#f97316", low: "#facc15" };

function severityIcon(severity) {
  const color = SEVERITY_COLOR[severity] ?? "#6b7280";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
    <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.9" stroke="#fff" stroke-width="2"/>
    <text x="12" y="16" text-anchor="middle" font-size="12" fill="#fff">!</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function LocateButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  function locate() {
    setLocating(true);
    map.locate({ setView: true, maxZoom: 15 });
    map.once("locationfound", () => setLocating(false));
    map.once("locationerror", () => setLocating(false));
  }

  return (
    <button
      onClick={locate}
      title="Go to my location"
      style={{
        position: "absolute",
        bottom: 20,
        right: 12,
        zIndex: 1000,
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: "50%",
        width: 44,
        height: 44,
        fontSize: 20,
        cursor: "pointer",
        color: locating ? "#f97316" : "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {locating ? "⏳" : "📍"}
    </button>
  );
}

export default function MapView() {
  return (
    <div className="map-container" style={{ position: "relative" }}>
      <MapContainer
        center={KW_CENTER}
        zoom={KW_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {PLACEHOLDER_POTHOLES.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={severityIcon(p.severity)}
          >
            <Popup>
              <strong>{p.address}</strong>
              <br />
              Severity: {p.severity}
            </Popup>
          </Marker>
        ))}
        <LocateButton />
      </MapContainer>
    </div>
  );
}
