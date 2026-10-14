// 抓取台灣期貨交易所「三大法人期貨每日交易行情」中「臺股期貨」區塊
// https://www.taifex.com.tw/cht/3/futContractsDate
//
// 原本用 Playwright 開上面的網頁抓表格，但該頁等待 networkidle 時常逾時，
// 改成直接呼叫網頁的「下載」功能（POST futContractsDateDown，回傳 Big5 編碼 CSV），
// 不需要開瀏覽器。查詢近 14 天、取最新一個交易日，資料的 date 欄位標示所屬交易日，
// 可用來判斷是否已更新為當日資料。
const { writeSourceData } = require("./lib/write-source-data");

const DOWNLOAD_URL = "https://www.taifex.com.tw/cht/3/futContractsDateDown";
const COMMODITY_ID = "TXF"; // 臺股期貨
const TARGET_PRODUCT = "臺股期貨";
const LOOKBACK_DAYS = 14;

// 期交所以台灣時間計日，格式 YYYY/MM/DD
function taipeiDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d
    .toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" })
    .replace(/-/g, "/");
}

async function scrape() {
  const res = await fetch(DOWNLOAD_URL, {
    method: "POST",
    body: new URLSearchParams({
      queryStartDate: taipeiDate(-LOOKBACK_DAYS),
      queryEndDate: taipeiDate(),
      commodityId: COMMODITY_ID,
    }),
  });
  if (!res.ok) {
    throw new Error(`下載失敗：HTTP ${res.status}`);
  }

  const text = new TextDecoder("big5").decode(await res.arrayBuffer());
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const header = headerLine.split(",");
  const rows = lines
    .map((line) => line.split(","))
    .filter((row) => row[1] === TARGET_PRODUCT);

  if (header[0] !== "日期" || rows.length === 0) {
    throw new Error("下載內容不符預期，格式可能已變更");
  }

  // 取最新一個交易日的資料（自營商/投信/外資及陸資三列）；YYYY/MM/DD 可直接字串比較
  const latestDate = rows.reduce((max, row) => (row[0] > max ? row[0] : max), "");
  return {
    date: latestDate,
    header,
    rows: rows.filter((row) => row[0] === latestDate),
  };
}

async function main() {
  const { date, header, rows } = await scrape();

  console.log(`資料日期：${date}`);
  console.log("欄位：", header);
  console.log(`「${TARGET_PRODUCT}」共 ${rows.length} 筆資料`);
  rows.forEach((row) => console.log(row));

  const outputPath = writeSourceData(TARGET_PRODUCT, { date, header, rows });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
