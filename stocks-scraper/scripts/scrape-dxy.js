// 抓取 MoneyDJ 美元指數 (DXY) 現值
// https://www.moneydj.com/iquote/iQuoteChart.djhtm?a=ei0001
//
// 頁面本身用 canvas 畫走勢圖，實際資料是從一個純文字資料源撈的：
// "{日期清單(逗號分隔,YYYYMMDD)} {開盤清單} {最高清單} {最低清單} {收盤清單}"
// 取最後一筆日期對應的收盤值當作目前美元指數。
//
// 這個頁面掛了大量廣告追蹤請求，網路一直有背景流量，用 networkidle 等待
// 容易 timeout（跟 scrape-vixtwn.js 踩過的坑類似），改成用 domcontentloaded
// 搭配攔截目標資料請求來判斷資料是否就緒。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.moneydj.com/iquote/iQuoteChart.djhtm?a=ei0001";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes("CRBa.djbcd")
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
  console.log(`美元指數：${value}`);

  const outputPath = writeSourceData("美元指數", value);
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
