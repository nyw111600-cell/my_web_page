const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'semiconductor_stock_returns.html');
const JSON_PATH = path.join(__dirname, '..', 'stocks_data.json');

async function fetchStockHistory(code) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
  const [r1, r2] = await Promise.all([
    fetch(`https://m.stock.naver.com/api/stock/${code}/price?page=1`, { headers }).then(r => r.json()),
    fetch(`https://m.stock.naver.com/api/stock/${code}/price?page=2`, { headers }).then(r => r.json())
  ]);
  return [...r1, ...r2];
}

async function updateStocks() {
  console.log('--- Starting Semiconductor Stocks Update via Naver Finance API ---');
  if (!fs.existsSync(HTML_PATH)) {
    console.error('HTML file not found at:', HTML_PATH);
    process.exit(1);
  }

  const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
  const match = htmlContent.match(/const STOCKS_DATA = (\[[\s\S]*?\]);\s*\n\/\/ Top Pinned Codes/);
  if (!match) {
    console.error('Could not find STOCKS_DATA in HTML file.');
    process.exit(1);
  }

  const stocks = JSON.parse(match[1]);
  console.log(`Loaded ${stocks.length} stocks from HTML.`);

  let refDates = null;
  const updatedStocks = [];

  for (let i = 0; i < stocks.length; i += 7) {
    const batch = stocks.slice(i, i + 7);
    const results = await Promise.all(batch.map(async (s) => {
      try {
        const all = await fetchStockHistory(s.code);
        if (!all || all.length < 31) {
          console.warn(`[WARN] Incomplete history for ${s.name} (${s.code}). Days: ${all ? all.length : 0}`);
          return s;
        }

        const parseNum = (str) => parseInt(String(str).replace(/,/g, ''), 10);
        const cur = parseNum(all[0].closePrice);
        const prev = parseNum(all[1].closePrice);
        const p5 = parseNum(all[5].closePrice);
        const p10 = parseNum(all[10].closePrice);
        const p20 = parseNum(all[20].closePrice);
        const p30 = parseNum(all[30].closePrice);

        const calcRate = (base) => base ? parseFloat((((cur - base) / base) * 100).toFixed(2)) : 0;
        const r5 = calcRate(p5);
        const r10 = calcRate(p10);
        const r20 = calcRate(p20);
        const r30 = calcRate(p30);

        const dayChange = cur - prev;
        const dayChangeRate = parseFloat((((cur - prev) / prev) * 100).toFixed(2));

        const d0 = all[0].localTradedAt.replace(/-/g, '');
        const d5 = all[5].localTradedAt.replace(/-/g, '');
        const d10 = all[10].localTradedAt.replace(/-/g, '');
        const d20 = all[20].localTradedAt.replace(/-/g, '');
        const d30 = all[30].localTradedAt.replace(/-/g, '');

        if (!refDates) {
          refDates = {
            d0: all[0].localTradedAt,
            d5: all[5].localTradedAt,
            d10: all[10].localTradedAt,
            d20: all[20].localTradedAt,
            d30: all[30].localTradedAt
          };
        }

        // 30 trading days chart data (chronological: oldest to newest)
        const chartData = all.slice(0, 30).reverse().map(item => ({
          date: item.localTradedAt.replace(/-/g, ''),
          close: parseNum(item.closePrice)
        }));

        return {
          ...s,
          currentPrice: cur,
          prevPrice: prev,
          dayChange,
          dayChangeRate,
          d0,
          d5,
          d10,
          d20,
          d30,
          p5,
          p10,
          p20,
          p30,
          r5,
          r10,
          r20,
          r30,
          chartData
        };
      } catch (err) {
        console.error(`Error updating ${s.name} (${s.code}):`, err.message);
        return s;
      }
    }));
    updatedStocks.push(...results);
  }

  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstDate = new Date(utc + (kstOffset * 60000));
  const kstString = kstDate.getFullYear() + '-' +
    String(kstDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(kstDate.getDate()).padStart(2, '0') + ' ' +
    String(kstDate.getHours()).padStart(2, '0') + ':' +
    String(kstDate.getMinutes()).padStart(2, '0') + ':' +
    String(kstDate.getSeconds()).padStart(2, '0');

  // Save stocks_data.json
  const jsonData = {
    updatedAt: kstString,
    referenceDates: refDates,
    stocks: updatedStocks
  };
  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonData, null, 2), 'utf8');
  console.log(`Saved ${JSON_PATH}`);

  // Update HTML content
  let newHtml = htmlContent.replace(
    /const STOCKS_DATA = (\[[\s\S]*?\]);\s*\n\/\/ Top Pinned Codes/,
    `const STOCKS_DATA = ${JSON.stringify(updatedStocks, null, 2)};\n\n// Top Pinned Codes`
  );

  if (refDates) {
    newHtml = newHtml.replace(/<strong id="current-date-text">[^<]*<\/strong>/, `<strong id="current-date-text">${refDates.d0}</strong>`);
    newHtml = newHtml.replace(/<span class="step-date" id="date-5d-label">[^<]*<\/span>/, `<span class="step-date" id="date-5d-label">${refDates.d5}</span>`);
    newHtml = newHtml.replace(/<span class="step-date" id="date-10d-label">[^<]*<\/span>/, `<span class="step-date" id="date-10d-label">${refDates.d10}</span>`);
    newHtml = newHtml.replace(/<span class="step-date" id="date-20d-label">[^<]*<\/span>/, `<span class="step-date" id="date-20d-label">${refDates.d20}</span>`);
    newHtml = newHtml.replace(/<span class="step-date" id="date-30d-label">[^<]*<\/span>/, `<span class="step-date" id="date-30d-label">${refDates.d30}</span>`);
  }
  newHtml = newHtml.replace(/<span id="last-updated-text">[^<]*<\/span>/, `<span id="last-updated-text">마지막 갱신: ${kstString} (네이버증권 실시간 연동)</span>`);

  fs.writeFileSync(HTML_PATH, newHtml, 'utf8');
  console.log(`Successfully updated ${HTML_PATH}`);
  console.log(`Completed at ${kstString} KST.`);
}

updateStocks();
