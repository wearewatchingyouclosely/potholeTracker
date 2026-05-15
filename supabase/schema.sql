-- Pothole Tracker — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.
-- Enable the PostGIS extension first if you want geo queries later.
-- extensions: uuid-ossp is enabled by default on Supabase.

-- ── Potholes ──────────────────────────────────────────────────────────────
-- One row per unique pothole location.
-- severity is COMPUTED from report_count — never set by users.
--   low:    1–2 reports
--   medium: 3–9 reports
--   high:   10+ reports
-- Thresholds can be tuned once real data is available.

CREATE TABLE IF NOT EXISTS potholes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  address      text,

  -- Derived field — recomputed by update_pothole_severity() trigger
  severity     text NOT NULL DEFAULT 'low'
                 CHECK (severity IN ('low', 'medium', 'high')),

  status       text NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'in_progress', 'repaired')),

  report_count integer NOT NULL DEFAULT 1,
  notes        text,
  photo_url    text
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER potholes_updated_at
  BEFORE UPDATE ON potholes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Recompute severity from report_count whenever a pothole row changes
CREATE OR REPLACE FUNCTION update_pothole_severity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.severity :=
    CASE
      WHEN NEW.report_count >= 10 THEN 'high'
      WHEN NEW.report_count >= 3  THEN 'medium'
      ELSE                             'low'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER potholes_severity
  BEFORE INSERT OR UPDATE OF report_count ON potholes
  FOR EACH ROW EXECUTE FUNCTION update_pothole_severity();

-- ── Reports ───────────────────────────────────────────────────────────────
-- One row per user submission. Multiple reports can reference the same pothole.
-- pothole_id may be NULL for a new (unmatched) submission before clustering.
-- severity is NOT stored on reports — it lives only on potholes, computed.
-- lat/lng is the exact user-confirmed pin position.
-- rough_lat/rough_lng captures the original device location used as the starting area.
-- This table intentionally stores the union of municipality-facing form fields
-- so one internal submission can later be mapped to Region/Kitchener/Waterloo/Cambridge.

CREATE TABLE IF NOT EXISTS reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),

  pothole_id   uuid REFERENCES potholes(id) ON DELETE SET NULL,

  issue_type   text NOT NULL DEFAULT 'pothole'
                 CHECK (issue_type IN ('pothole', 'road_damage', 'construction_issue')),
  issue_category text,

  lat          double precision NOT NULL,
  lng          double precision NOT NULL,
  rough_lat    double precision,
  rough_lng    double precision,
  rough_accuracy_m double precision,
  address      text,
  cross_streets text,
  landmark     text,
  lane_direction text,

  notes        text,
  photo_url    text,

  municipality text,
  road_owner   text,
  submission_target text,
  is_urgent    boolean NOT NULL DEFAULT false,

  contact_name text,
  contact_email text,
  contact_phone text,
  contact_address text,

  status       text NOT NULL DEFAULT 'submitted'
                 CHECK (status IN ('submitted', 'routed', 'resolved'))
);

-- ── Row-Level Security ────────────────────────────────────────────────────
-- Public (anon) can read potholes and insert reports.
-- Nothing is writable except reports by anon.

ALTER TABLE potholes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read potholes"
  ON potholes FOR SELECT USING (true);

CREATE POLICY "Public insert reports"
  ON reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read reports"
  ON reports FOR SELECT USING (true);
