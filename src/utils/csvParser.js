export function parseBalanceHistory(csvText) {
  const lines = csvText.trim().split("\n");
  const header = lines[0].split(",");
  
  // Tempo,L&P realizado (valor),L&P realizado (moeda),Ação
  const trades = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Using a regex to handle quoted commas in the Action field
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!parts || parts.length < 4) {
      // Fallback for simple lines
      const simpleParts = line.split(",");
      if (simpleParts.length < 4) continue;
    }
    
    // Let's use a more robust split for CSV with quotes
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const columns = line.split(regex).map(c => c.trim().replace(/^"|"$/g, ""));
    
    if (columns.length < 4) continue;
    
    const [tempo, pnlStr, moeda, acao] = columns;
    const pnl = parseFloat(pnlStr);
    
    // Parse Action: "Close long position for symbol CAPITALCOM:US100 at price 27054.4 for 10 units..."
    const symbolMatch = acao.match(/symbol ([\w:]+)/);
    const symbol = symbolMatch ? symbolMatch[1].split(":").pop() : "Unknown";
    
    const directionMatch = acao.match(/Close (long|short) position/);
    const direction = directionMatch ? (directionMatch[1] === "long" ? "Long" : "Short") : "Unknown";
    
    const [date, time] = tempo.split(" ");
    
    trades.push({
      date,
      entryTime: time.substring(0, 5), // Using exit time as entry time proxy for now
      exitTime: time.substring(0, 5),
      asset: symbol,
      assetClass: "Futuros", // Defaulting to Futuros as requested
      direction,
      pnl,
      result: pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "BE",
      risk: Math.abs(pnl), // Placeholder until position history is imported
      rrPlanned: 0,
      rrRealized: 0,
      setup: "Imported",
      killzone: "Unknown",
      confluences: [],
      macroEvents: [],
      emotions: [],
      story: acao
    });
  }
  
  return trades;
}
