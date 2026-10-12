// 抓取台灣證交所「三大法人買賣金額統計表」(bfi82u)
// https://www.twse.com.tw/zh/trading/foreign/bfi82u.html
//
// 原本用 Playwright 開上面的網頁抓表格，但該頁會擋部分 IP（例如雲端主機），
// 改成直接呼叫網頁背後的 JSON API，不需要開瀏覽器。
// 回傳的 date 欄位標示資料所屬交易日，可用來判斷是否已更新為當日資料。
const { writeSourceData } = require("./lib/write-source-data");

const API_URL = "https://www.twse.com.tw/rwd/zh/fund/BFI82U?response=json";

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

  const outputPath = writeSourceData("三大法人買賣超", {
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
