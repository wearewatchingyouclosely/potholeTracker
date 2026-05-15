const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

exports.handler = async () => {
  const { data, error } = await supabase
    .from("potholes")
    .select("id, lat, lng, address, severity, status, report_count, notes, photo_url, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
};
