import React, { useState } from "react";
import MapView from "./components/MapView";
import ReportView from "./components/ReportView";

const TABS = [
  { id: "map", label: "Map", icon: "🗺️" },
  { id: "report", label: "Report", icon: "📍" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="app">
      <div className="tab-content">
        {activeTab === "map" && <MapView />}
        {activeTab === "report" && <ReportView />}
      </div>

      <nav className="bottom-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
