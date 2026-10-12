// 抓取台灣證交所「每日市場成交資訊」(fmtqik)
// https://www.twse.com.tw/zh/trading/historical/fmtqik.html
//
// 原本用 Playwright 開上面的網頁抓表格，但該頁會擋部分 IP（例如雲端主機），
// 改成直接呼叫網頁背後的 JSON API，不需要開瀏覽器。
// 回傳的是當月每個交易日的資料，date 欄位標示最新資料所屬交易日。
const { writeSourceData } = require("./lib/write-source-data");

const API_URL =
  "https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?response=json";

async function scrape() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`API 回應失敗：HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.stat !== "OK") {
    throw new Error(`API 回傳非成功狀態：${json.stat}`);
  }
  if (!json.fields?.length || !json.data?.length) {
    throw new Error("API 回傳資料為空，格式可能已變更");
  }

  return json;
}

async function main() {
  const { date, title, fields: header, data: rows } = await scrape();

  console.log(title);
  console.log("欄位：", header);
  console.log(`共 ${rows.length} 筆資料`);
  rows.forEach((row) => console.log(row));

  const outputPath = writeSourceData("每日市場成交資訊", {
    date,
    title,
    header,
    rows,
  });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
