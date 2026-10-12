// 抓取台灣期貨交易所「三大法人期貨每日交易行情」中「臺股期貨」區塊
// https://www.taifex.com.tw/cht/3/futContractsDate
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.taifex.com.tw/cht/3/futContractsDate";
const TARGET_PRODUCT = "臺股期貨";
// 每個商品只有自營商/投信/外資三列（無「合計」列），商品名稱欄用 rowspan
// 橫跨這三列，因此只有該商品的第一列（自營商）才會有「商品名稱」儲存格，
// 後續兩列（投信/外資）的第一格直接就是身份別文字
const CONTINUATION_IDENTITY_LABELS = ["投信", "外資"];

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("table");

  const rows = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const target = tables.reduce((best, t) => {
      const rowCount = t.querySelectorAll("tr").length;
      return rowCount > (best?.rowCount ?? 0) ? { table: t, rowCount } : best;
    }, null)?.table;

    if (!target) return null;

    return Array.from(target.querySelectorAll("tr"))
      .map((tr) =>
        Array.from(tr.querySelectorAll("th, td")).map((cell) =>
          cell.innerText.trim().replace(/\s+/g, ""),
        ),
      )
      .filter((row) => row.length > 0);
  });

  await browser.close();

  if (!rows || rows.length === 0) {
    throw new Error("找不到資料表，頁面結構可能已變更");
  }

  return rows;
}

function extractProductBlock(rows, productName) {
  // 商品名稱出現在該商品第一列（自營商列）的第 2 個儲存格（第 1 格是序號）
  const startIndex = rows.findIndex((row) => row[1] === productName);
  if (startIndex === -1) {
    throw new Error(`找不到「${productName}」區塊，頁面結構可能已變更`);
  }

  // 表格最上方、序號列出現以前的所有列都是多層表頭
  const header = rows.slice(0, startIndex);

  const block = [rows[startIndex]];
  for (let i = startIndex + 1; i < rows.length; i++) {
    if (!CONTINUATION_IDENTITY_LABELS.includes(rows[i][0])) break;
    block.push(rows[i]);
  }

  return { header, rows: block };
}

async function main() {
  const rows = await scrape();
  const { header, rows: block } = extractProductBlock(rows, TARGET_PRODUCT);

  console.log("欄位：", header);
  console.log(`「${TARGET_PRODUCT}」共 ${block.length} 筆資料`);
  block.forEach((row) => console.log(row));

  const outputPath = writeSourceData(TARGET_PRODUCT, { header, rows: block });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
