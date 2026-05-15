const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

const MATCH_RADIUS_METERS = 20;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findNearbyPothole(lat, lng) {
  const { data, error } = await supabase
    .from("potholes")
    .select("id, lat, lng, report_count")
    .limit(500);

  if (error) {
    throw error;
  }

  let nearestMatch = null;

  for (const pothole of data) {
    const distanceMeters = getDistanceMeters(
      { lat, lng },
      { lat: pothole.lat, lng: pothole.lng }
    );

    if (distanceMeters > MATCH_RADIUS_METERS) {
      continue;
    }

    if (!nearestMatch || distanceMeters < nearestMatch.distanceMeters) {
      nearestMatch = { ...pothole, distanceMeters };
    }
  }

  return nearestMatch;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const {
    lat,
    lng,
    rough_lat,
    rough_lng,
    rough_accuracy_m,
    address,
    cross_streets,
    landmark,
    lane_direction,
    issue_type,
    issue_category,
    notes,
    photo_url,
    municipality,
    road_owner,
    submission_target,
    is_urgent,
    contact_name,
    contact_email,
    contact_phone,
    contact_address,
  } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "lat and lng are required" }),
    };
  }

  let pothole = null;

  try {
    const nearbyPothole = await findNearbyPothole(lat, lng);

    if (nearbyPothole) {
      const { data: updatedPothole, error: updateError } = await supabase
        .from("potholes")
        .update({ report_count: nearbyPothole.report_count + 1 })
        .eq("id", nearbyPothole.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      pothole = updatedPothole;
    } else {
      const { data: insertedPothole, error: insertError } = await supabase
        .from("potholes")
        .insert({ lat, lng, address, notes, photo_url, report_count: 1 })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      pothole = insertedPothole;
    }
  } catch (potholeError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: potholeError.message }),
    };
  }

  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert({
      pothole_id: pothole.id,
      lat,
      lng,
      rough_lat: typeof rough_lat === "number" ? rough_lat : null,
      rough_lng: typeof rough_lng === "number" ? rough_lng : null,
      rough_accuracy_m: typeof rough_accuracy_m === "number" ? rough_accuracy_m : null,
      address,
      cross_streets,
      landmark,
      lane_direction,
      issue_type: issue_type || "pothole",
      issue_category,
      notes,
      photo_url,
      municipality,
      road_owner,
      submission_target,
      is_urgent: Boolean(is_urgent),
      contact_name,
      contact_email,
      contact_phone,
      contact_address,
    })
    .select()
    .single();

  if (reportError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: reportError.message }),
    };
  }

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report, pothole }),
  };
};
