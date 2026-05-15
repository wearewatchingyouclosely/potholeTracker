import React, { useState } from "react";

export default function ReportView() {
  const [step, setStep] = useState("idle"); // idle | locating | form | done

  function startManualReport() {
    setStep("locating");
    navigator.geolocation.getCurrentPosition(
      () => setStep("form"),
      () => setStep("form") // still show the form even without GPS
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
            Reports are routed to the correct Waterloo Region authority based on
            road ownership. You'll get a chance to review before we send
            anything.
          </p>
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
          <p style={{ marginTop: 8 }}>Fill in what you know — photo is optional.</p>
        </div>

        <PlaceholderForm onSubmit={() => setStep("done")} onBack={() => setStep("idle")} />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="report-view" style={{ alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ fontSize: 56 }}>✅</span>
        <h2>Report Submitted</h2>
        <p style={{ textAlign: "center" }}>
          We'll route this to the right municipal authority. Thanks for helping
          fix Waterloo Region's roads.
        </p>
        <button className="btn-secondary" onClick={() => setStep("idle")}>
          Report Another
        </button>
      </div>
    );
  }

  return null;
}

function PlaceholderForm({ onSubmit, onBack }) {
  const [severity, setSeverity] = useState("medium");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={labelStyle}>
        Address or Intersection
        <input
          type="text"
          placeholder="e.g. King St & University Ave"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        Severity
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {["low", "medium", "high"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                background:
                  severity === s
                    ? s === "high"
                      ? "#ef4444"
                      : s === "medium"
                      ? "#f97316"
                      : "#facc15"
                    : "#374151",
                color: severity === s && s === "low" ? "#111827" : "#f9fafb",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </label>

      <label style={labelStyle}>
        Notes (optional)
        <textarea
          placeholder="Any extra details…"
          rows={3}
          style={{ ...inputStyle, resize: "none" }}
        />
      </label>

      <label style={labelStyle}>
        Photo (optional)
        <input type="file" accept="image/*" capture="environment" style={{ marginTop: 8, color: "#9ca3af" }} />
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onBack}>
          ← Back
        </button>
        <button className="btn-primary" style={{ flex: 2 }} onClick={onSubmit}>
          Submit Report
        </button>
      </div>
    </div>
  );
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
