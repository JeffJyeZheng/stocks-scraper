// 抓取台灣銀行牌告匯率的美元兌台幣即期匯率
// https://rate.bot.com.tw/xrt?Lang=zh-TW
//
// 這頁是純靜態 HTML（頁面自己註明「本網頁牌告匯率資訊為靜態顯示」），
// 不需要像其他爬蟲那樣等待非同步資料載入。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://rate.bot.com.tw/xrt?Lang=zh-TW";
const KEY = "美元兌台幣匯率";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("table");

  const rows = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const target = tables.reduce((best, t) => {
      const rowCount = t.querySelectorAll("tr").length;
      return rowCount > (best?.rowCount ?? 0) ? { table: t, rowCount } : best;
    }, null)?.table;

    if (!target) return null;

    return Array.from(target.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th, td")).map((cell) =>
        cell.innerText.trim()
      )
    );
  });

  await browser.close();

  if (!rows || rows.length === 0) {
    throw new Error("找不到匯率表，頁面結構可能已變更");
  }

  const usdRow = rows.find((row) => row[0]?.includes("USD"));
  if (!usdRow) {
    throw new Error("找不到美元這一列，頁面結構可能已變更");
  }

  // 欄位順序：幣別, 現金買入, 現金賣出, 即期買入, 即期賣出, ...
  const buy = parseFloat(usdRow[3]);
  const sell = parseFloat(usdRow[4]);
  if (Number.isNaN(buy) || Number.isNaN(sell)) {
    throw new Error("無法解析即期匯率數值，頁面結構可能已變更");
  }

  return { 買入: buy, 賣出: sell };
}

async function main() {
  const value = await scrape();
  console.log(`${KEY}：`, value);

  const outputPath = writeSourceData(KEY, value);
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
