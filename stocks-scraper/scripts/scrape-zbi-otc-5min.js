// 抓取 MoneyDJ 上櫃(OTC)指數分時走勢（09:00-13:30，每五分鐘一筆）
// https://5850web.moneydj.com/z/zb/zbi/zbi.djhtm
//
// 預設頁面顯示的是加權指數，切換左上角下拉選單（<select name="M">）選「上櫃」
// 後才會改用 OTC 指數重新請求 CZBI.DJBCD 資料源，解析邏輯見 scripts/lib/parse-czbi.js
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");
const { parseCzbiBody } = require("./lib/parse-czbi");

const URL = "https://5850web.moneydj.com/z/zb/zbi/zbi.djhtm";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes("CZBI.DJBCD")
  );
  await page.selectOption('select[name="M"]', { label: "上櫃" });
  const response = await responsePromise;
  const text = await response.text();

  await browser.close();

  return parseCzbiBody(text, "OTC指數");
}

async function main() {
  const { header, rows } = await scrape();

  console.log("欄位：", header);
  console.log(`共 ${rows.length} 筆資料`);
  rows.forEach((row) => console.log(row));

  const outputPath = writeSourceData("OTC指數五分鐘走勢", { header, rows });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
