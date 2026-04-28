/**
 * One-time migration script: push ALL trades from localStorage to Supabase.
 * Run with: node migrate-to-supabase.js
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const SUPABASE_URL = "https://pysyefetnnqecbxiicog.supabase.co";
const SUPABASE_KEY = "sb_publishable_JV7mQHb2tEY1eVjQ9tcxvQ_O3g8CN1_";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Read trades from a JSON export of localStorage
// First, export from browser console: copy(localStorage.getItem("tj-trades"))
// Then paste into trades-export.json
const TRADES_FILE = "./trades-export.json";

function toSnake(t) {
  return {
    id: t.id || `TJ-MIGR-${Date.now()}`,
    account: t.account || "Padrão",
    date: t.date || "2026-01-01",
    entry_time: t.entryTime || null,
    exit_time: t.exitTime || null,
    asset: t.asset || "NQ",
    asset_class: t.assetClass || null,
    direction: ["Long", "Short"].includes(t.direction) ? t.direction : null,
    killzone: t.killzone || null,
    setup: t.setup || null,
    dol: t.dol || null,
    confluences: t.confluences || [],
    macro_events: t.macroEvents || [],
    dxy_bias: t.dxyBias || null,
    sentiment: t.sentiment || null,
    rr_planned: Number(t.rrPlanned) || 0,
    rr_realized: Number(t.rrRealized) || 0,
    risk: Number(t.risk) || 0,
    result: ["Win", "Loss", "BE"].includes(t.result) ? t.result : null,
    pnl: Number(t.pnl) || 0,
    mistake: t.mistake || null,
    emotions: t.emotions || [],
    htf: t.htf || null,
    story: t.story || null,
    checklist_data: t.checklistData || null,
    psychology_data: t.psychologyData || null,
    screenshot_urls: {},
  };
}

async function migrate() {
  let trades;
  try {
    const raw = fs.readFileSync(TRADES_FILE, "utf-8");
    trades = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Could not read ${TRADES_FILE}`);
    console.log("");
    console.log("Steps to export your trades:");
    console.log("1. Open http://localhost:5173 in your browser");
    console.log("2. Open DevTools Console (F12)");
    console.log('3. Run: copy(localStorage.getItem("tj-trades"))');
    console.log(`4. Paste the content into a file called ${TRADES_FILE}`);
    console.log("5. Run this script again");
    process.exit(1);
  }

  if (!Array.isArray(trades) || trades.length === 0) {
    console.log("No trades to migrate.");
    return;
  }

  console.log(`📦 Found ${trades.length} trades to migrate.\n`);

  let success = 0;
  let failed = 0;

  for (const trade of trades) {
    const row = toSnake(trade);
    const { error } = await sb
      .from("trades")
      .upsert(row, { onConflict: "id" });

    if (error) {
      console.error(`❌ ${row.id} (${row.asset}): ${error.message}`);
      failed++;
    } else {
      console.log(`✅ ${row.id} — ${row.asset} ${row.direction || "?"} ${row.result || "?"} $${row.pnl}`);
      success++;
    }
  }

  console.log(`\n🏁 Done: ${success} migrated, ${failed} failed out of ${trades.length}`);
}

migrate();
