import React, { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const KW_CENTER = [43.4516, -80.4925];
const PIN_PICKER_ZOOM = 17;

export default function ReportView() {
  const [step, setStep] = useState("idle"); // idle | locating | form | done
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);

  function getLocationErrorMessage(error) {
    if (!error) {
      return "Unable to get your location.";
    }

    if (error.code === 1) {
      return "Location permission was denied. You can still place the pin manually.";
    }

    if (error.code === 2) {
      return "Your location could not be determined. You can still place the pin manually.";
    }

    if (error.code === 3) {
      return "Location request timed out. You can still place the pin manually.";
    }

    return error.message || "Unable to get your location.";
  }

  function startManualReport() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("This browser does not support geolocation. Place the pin manually.");
      setStep("form");
      return;
    }

    setStep("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStep("form");
      },
      (error) => {
        const secureContextHint = !window.isSecureContext
          ? " Mobile browsers usually require HTTPS for location access."
          : "";

        setLocationError(`${getLocationErrorMessage(error)}${secureContextHint}`);
        setStep("form");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }

  if (step === "idle") {
    return (
      <div className="report-view">
        <div>
          <h2>Report a Pothole</h2>
          <p style={{ marginTop: 8 }}>
            Spotted a pothole? Drop a pin at your location or enter an address.
          </p>
        </div>

        <div className="report-actions">
          <button className="btn-primary" onClick={startManualReport}>
            📍 Use My Current Location
          </button>
          <button className="btn-secondary" onClick={() => setStep("form")}>
            ✏️ Enter Address Manually
          </button>
        </div>

        <div>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            For now, reports stay inside your own database so you can validate
            the workflow and the pothole data before any municipal submission
            logic exists.
          </p>
          {!window.isSecureContext && (
            <p style={{ fontSize: 13, color: "#f59e0b", marginTop: 8 }}>
              Mobile geolocation often fails on non-HTTPS pages. If you open this app from a phone over a local IP address, location access may be blocked.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "locating") {
    return (
      <div className="report-view" style={{ alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 40 }}>📡</span>
        <p>Getting your location…</p>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="report-view">
        <div>
          <h2>Pothole Details</h2>
          <p style={{ marginTop: 8 }}>
            We&apos;ll use your current location as a rough starting area. Drag the
            pin onto the exact pothole before you submit.
          </p>
          {locationError && (
            <p style={{ marginTop: 8, color: "#f59e0b" }}>{locationError}</p>
          )}
        </div>

        <PlaceholderForm onSubmit={() => setStep("done")} onBack={() => setStep("idle")} coords={coords} />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="report-view" style={{ alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ fontSize: 56 }}>✅</span>
        <h2>Report Submitted</h2>
        <p style={{ textAlign: "center" }}>
          Your report was saved to the internal pothole database.
        </p>
        <button className="btn-secondary" onClick={() => setStep("idle")}>
          Report Another
        </button>
      </div>
    );
  }

  return null;
}

function PlaceholderForm({ onSubmit, onBack, coords }) {
  const [address, setAddress] = useState("");
  const [crossStreets, setCrossStreets] = useState("");
  const [landmark, setLandmark] = useState("");
  const [laneDirection, setLaneDirection] = useState("");
  const [issueCategory, setIssueCategory] = useState("pothole");
  const [notes, setNotes] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [roadOwner, setRoadOwner] = useState("");
  const [submissionTarget, setSubmissionTarget] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [pinCoords, setPinCoords] = useState(
    coords
      ? { lat: coords.lat, lng: coords.lng }
      : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationLookupError, setLocationLookupError] = useState(null);

  const [addressAutofillEnabled, setAddressAutofillEnabled] = useState(true);
  const [crossStreetsAutofillEnabled, setCrossStreetsAutofillEnabled] = useState(true);

  useEffect(() => {
    if (!pinCoords) {
      return undefined;
    }

    const controller = new AbortController();

    async function resolveLocationDetails() {
      setIsResolvingLocation(true);
      setLocationLookupError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pinCoords.lat}&lon=${pinCoords.lng}&zoom=18&addressdetails=1`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Reverse geocoding failed with HTTP ${response.status}`);
        }

        const data = await response.json();
        const nextAddress = buildAddressLabel(data);
        const nextCrossStreets = buildCrossStreetLabel(data, nextAddress);

        if (nextAddress && addressAutofillEnabled) {
          setAddress(nextAddress);
        }

        if (nextCrossStreets && crossStreetsAutofillEnabled) {
          setCrossStreets(nextCrossStreets);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setLocationLookupError("Could not auto-fill address details for this pin.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsResolvingLocation(false);
        }
      }
    }

    const timeoutId = window.setTimeout(resolveLocationDetails, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pinCoords?.lat, pinCoords?.lng, addressAutofillEnabled, crossStreetsAutofillEnabled]);

  async function handleSubmit() {
    if (!pinCoords) {
      setSubmitError("Place the pin on the pothole before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pinCoords.lat,
          lng: pinCoords.lng,
          rough_lat: coords?.lat ?? null,
          rough_lng: coords?.lng ?? null,
          rough_accuracy_m: coords?.accuracy ?? null,
          address: address || null,
          cross_streets: crossStreets || null,
          landmark: landmark || null,
          lane_direction: laneDirection || null,
          issue_type: issueCategory === "construction_issue" ? "construction_issue" : "pothole",
          issue_category: issueCategory || null,
          notes: notes || null,
          municipality: municipality || null,
          road_owner: roadOwner || null,
          submission_target: submissionTarget || null,
          is_urgent: isUrgent,
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          contact_address: contactAddress || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      onSubmit();
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="status-chip">
        {coords
          ? `GPS fix acquired. Drag pin to exact pothole.`
          : `No GPS fix yet. Tap the map to drop a pin.`}
      </div>

      <div className="pin-picker-card">
        <PinPicker
          roughCoords={coords}
          pinCoords={pinCoords}
          onPinChange={setPinCoords}
        />
      </div>

      <div className="pin-summary">
        <span>Exact pin</span>
        <strong>
          {pinCoords
            ? `${pinCoords.lat.toFixed(6)}, ${pinCoords.lng.toFixed(6)}`
            : "Not set"}
        </strong>
      </div>

      {isResolvingLocation && (
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Looking up address details for the selected pin…</p>
      )}

      {locationLookupError && (
        <p style={{ fontSize: 13, color: "#f59e0b" }}>{locationLookupError}</p>
      )}

      <label style={labelStyle}>
        Address or Intersection
        <input
          type="text"
          placeholder="e.g. King St & University Ave"
          value={address}
          onChange={(e) => {
            setAddressAutofillEnabled(false);
            setAddress(e.target.value);
          }}
          style={inputStyle}
        />
      </label>

      {!addressAutofillEnabled && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setAddressAutofillEnabled(true)}
          style={{ padding: "10px 12px", fontSize: 13 }}
        >
          Re-enable address auto-fill
        </button>
      )}

      <label style={labelStyle}>
        Cross Streets (optional)
        <input
          type="text"
          placeholder="e.g. King St W and University Ave W"
          value={crossStreets}
          onChange={(e) => {
            setCrossStreetsAutofillEnabled(false);
            setCrossStreets(e.target.value);
          }}
          style={inputStyle}
        />
      </label>

      {!crossStreetsAutofillEnabled && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setCrossStreetsAutofillEnabled(true)}
          style={{ padding: "10px 12px", fontSize: 13 }}
        >
          Re-enable cross-street auto-fill
        </button>
      )}

      <label style={labelStyle}>
        Landmark / In Front Of (optional)
        <input
          type="text"
          placeholder="e.g. in front of 200 King St"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Lane Direction (optional)
        <select
          value={laneDirection}
          onChange={(e) => setLaneDirection(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select lane direction</option>
          <option value="northbound">Northbound</option>
          <option value="southbound">Southbound</option>
          <option value="eastbound">Eastbound</option>
          <option value="westbound">Westbound</option>
          <option value="inner_lane">Inner lane</option>
          <option value="outer_lane">Outer lane</option>
          <option value="bike_lane">Bike lane</option>
          <option value="shoulder">Shoulder</option>
        </select>
      </label>

      <label style={labelStyle}>
        Issue Category
        <select
          value={issueCategory}
          onChange={(e) => setIssueCategory(e.target.value)}
          style={inputStyle}
        >
          <option value="pothole">Pothole</option>
          <option value="road_damage">Road damage</option>
          <option value="construction_issue">Construction issue</option>
        </select>
      </label>

      <label style={labelStyle}>
        Notes (optional)
        <textarea
          placeholder="Any extra details…"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...inputStyle, resize: "none" }}
        />
      </label>

      <label style={labelStyle}>
        Municipality (optional)
        <select
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          style={inputStyle}
        >
          <option value="">Unknown / detect later</option>
          <option value="region_of_waterloo">Region of Waterloo</option>
          <option value="kitchener">Kitchener</option>
          <option value="waterloo">Waterloo</option>
          <option value="cambridge">Cambridge</option>
        </select>
      </label>

      <label style={labelStyle}>
        Road Owner (optional)
        <select
          value={roadOwner}
          onChange={(e) => setRoadOwner(e.target.value)}
          style={inputStyle}
        >
          <option value="">Unknown / detect later</option>
          <option value="regional">Regional road</option>
          <option value="municipal">Municipal road</option>
        </select>
      </label>

      <label style={labelStyle}>
        Intended Submission Target (optional)
        <select
          value={submissionTarget}
          onChange={(e) => setSubmissionTarget(e.target.value)}
          style={inputStyle}
        >
          <option value="">Internal only for now</option>
          <option value="region_feedback">Region feedback/complaints</option>
          <option value="region_construction">Region construction issue form</option>
          <option value="kitchener_report_problem">Kitchener report-a-problem</option>
          <option value="waterloo_issue_form">Waterloo report an issue</option>
          <option value="cambridge_service_request">Cambridge service request</option>
        </select>
      </label>

      <label style={checkboxLabelStyle}>
        <input
          type="checkbox"
          checked={isUrgent}
          onChange={(e) => setIsUrgent(e.target.checked)}
        />
        <span>This is an urgent or safety-related issue</span>
      </label>

      <label style={labelStyle}>
        Contact Name (optional)
        <input
          type="text"
          placeholder="Your name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Contact Email (optional)
        <input
          type="email"
          placeholder="you@example.com"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Contact Phone (optional)
        <input
          type="tel"
          placeholder="519-555-1234"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Contact Address (optional)
        <input
          type="text"
          placeholder="Mailing address if required for follow-up"
          value={contactAddress}
          onChange={(e) => setContactAddress(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Photo (optional)
        <input type="file" accept="image/*" capture="environment" style={{ marginTop: 8, color: "#9ca3af" }} />
      </label>

      {submitError && (
        <p style={{ color: "#ef4444", fontSize: 13 }}>Error: {submitError}</p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack} disabled={submitting}>
          ← Back
        </button>
        <button className="btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
      </div>
    </div>
  );
}

function PinPicker({ roughCoords, pinCoords, onPinChange }) {
  const center = pinCoords
    ? [pinCoords.lat, pinCoords.lng]
    : roughCoords
      ? [roughCoords.lat, roughCoords.lng]
      : KW_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={roughCoords ? PIN_PICKER_ZOOM : 13}
      style={{ height: "240px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PinPickerEvents onPinChange={onPinChange} />
      {roughCoords && (
        <Circle
          center={[roughCoords.lat, roughCoords.lng]}
          radius={Math.max(roughCoords.accuracy ?? 25, 25)}
          pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.18 }}
        />
      )}
      {pinCoords && (
        <Marker
          draggable={true}
          position={[pinCoords.lat, pinCoords.lng]}
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target;
              const nextPosition = marker.getLatLng();
              onPinChange({ lat: nextPosition.lat, lng: nextPosition.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}

function buildAddressLabel(data) {
  const address = data?.address;

  if (!address) {
    return data?.display_name || "";
  }

  const street = address.road || address.pedestrian || address.footway || address.cycleway;
  const houseNumber = address.house_number;

  if (street && houseNumber) {
    return `${houseNumber} ${street}`;
  }

  if (street) {
    return street;
  }

  return data?.display_name || "";
}

function buildCrossStreetLabel(data, exactAddress) {
  const address = data?.address;

  if (!address) {
    return "";
  }

  const parts = [];

  if (address.road && address.road !== exactAddress) {
    parts.push(address.road);
  }

  if (address.suburb) {
    parts.push(address.suburb);
  }

  if (address.city || address.town || address.village) {
    parts.push(address.city || address.town || address.village);
  }

  return parts.join(", ");
}

function PinPickerEvents({ onPinChange }) {
  useMapEvents({
    click(event) {
      onPinChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: "#d1d5db",
};

const inputStyle = {
  marginTop: 4,
  padding: "12px",
  background: "#374151",
  border: "1px solid #4b5563",
  borderRadius: 8,
  color: "#f9fafb",
  fontSize: 15,
  outline: "none",
  width: "100%",
};

const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  fontWeight: 600,
  color: "#d1d5db",
};
