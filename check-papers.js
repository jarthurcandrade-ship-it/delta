const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://pysyefetnnqecbxiicog.supabase.co";
const SUPABASE_KEY = "sb_publishable_JV7mQHb2tEY1eVjQ9tcxvQ_O3g8CN1_";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await sb.from("papers").select("id").limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Papers table exists, data:", data);
  }
}
check();
