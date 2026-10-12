// 抓取 MoneyDJ CBOE VIX 恐慌指數現值
// https://www.moneydj.com/iquote/iQuoteChart.djhtm?a=AI001049
//
// 跟 scrape-dxy.js 同一種頁面架構：canvas 畫走勢圖，實際資料是從一個
// 純文字資料源撈的："{日期清單} {開盤清單} {最高清單} {最低清單} {收盤清單}"，
// 取最後一筆日期對應的收盤值當作目前 VIX 指數。這頁一樣掛了大量廣告追蹤
// 請求，改用 domcontentloaded 搭配攔截目標資料請求判斷資料是否就緒。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.moneydj.com/iquote/iQuoteChart.djhtm?a=AI001049";
const KEY = "CBOE VIX指數";

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
