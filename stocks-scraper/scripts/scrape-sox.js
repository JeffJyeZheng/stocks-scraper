// 抓取 MoneyDJ 費城半導體指數 (SOX) 現值
// https://www.moneydj.com/iquote/iQuoteChart.djhtm?a=AI000140
//
// 跟 scrape-dxy.js / scrape-cboe-vix.js 同一種頁面架構：canvas 畫走勢圖，
// 實際資料是從一個純文字資料源撈的："{日期清單} {開盤} {最高} {最低} {收盤}"，
// 取最後一筆日期對應的收盤值當作目前指數。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.moneydj.com/iquote/iQuoteChart.djhtm?a=AI000140";
const KEY = "費城半導體指數";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes(".djbcd")
  );
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  const response = await responsePromise;
  const text = await response.text();

  await browser.close();

  const parts = text.trim().split(" ");
  if (parts.length < 5) {
    throw new Error("資料格式不符預期，頁面結構可能已變更");
  }

  const closes = parts[4].split(",");
  const value = parseFloat(closes[closes.length - 1]);
  if (Number.isNaN(value)) {
    throw new Error(
      `無法解析數值「${closes[closes.length - 1]}」，頁面結構可能已變更`
    );
  }

  return value;
}

async function main() {
  const value = await scrape();
  console.log(`${KEY}：${value}`);

  const outputPath = writeSourceData(KEY, value);
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
