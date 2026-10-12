// 抓取 MoneyDJ 加權指數分時走勢（09:00-13:30，每五分鐘一筆）
// https://5850web.moneydj.com/z/zb/zbi/zbi.djhtm
//
// 頁面本身用 canvas 畫分時線圖，實際資料是從 CZBI.DJBCD 這個純文字資料源撈的，
// 解析邏輯見 scripts/lib/parse-czbi.js
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");
const { parseCzbiBody } = require("./lib/parse-czbi");

const URL = "https://5850web.moneydj.com/z/zb/zbi/zbi.djhtm";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes("CZBI.DJBCD")
  );
  await page.goto(URL, { waitUntil: "networkidle" });
  const response = await responsePromise;
  const text = await response.text();

  await browser.close();

  return parseCzbiBody(text, "加權指數");
}

async function main() {
  const { header, rows } = await scrape();

  console.log("欄位：", header);
  console.log(`共 ${rows.length} 筆資料`);
  rows.forEach((row) => console.log(row));

  const outputPath = writeSourceData("加權指數五分鐘走勢", { header, rows });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
