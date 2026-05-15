const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    realtime: { transport: ws },
  });
}

exports.handler = async () => {
  let supabase;

  try {
    supabase = getSupabaseClient();
  } catch (clientError) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: clientError.message }),
    };
  }

  const { data, error } = await supabase
    .from("potholes")
    .select("id, lat, lng, address, severity, status, report_count, notes, photo_url, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
};
