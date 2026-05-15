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
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/potholes")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setPotholes(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="map-container" style={{ position: "relative" }}>
      {loading && (
        <div style={overlayStyle}>Loading potholes…</div>
      )}
      {error && (
        <div style={{ ...overlayStyle, color: "#ef4444" }}>Failed to load: {error}</div>
      )}
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
        {potholes.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={severityIcon(p.severity)}
          >
            <Popup>
              <strong>{p.address ?? "Unknown location"}</strong>
              <br />
              Severity: {p.severity}
              <br />
              Reports: {p.report_count}
              <br />
              Status: {p.status}
            </Popup>
          </Marker>
        ))}
        <LocateButton />
      </MapContainer>
    </div>
  );
}

const overlayStyle = {
  position: "absolute",
  top: 12,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
  background: "rgba(31,41,55,0.9)",
  color: "#f9fafb",
  padding: "6px 14px",
  borderRadius: 20,
  fontSize: 13,
  pointerEvents: "none",
};
