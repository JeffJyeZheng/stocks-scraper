// 抓取 Yahoo 股市台指期近一合約成交價
// https://tw.stock.yahoo.com/future/WTX&
//
// 報價欄位是一排 <li class="price-detail-item"> ，每個 li 底下兩個 <span>
// 分別是標籤（如「成交」）跟數值。數值是非同步填入的，要等到真的有值
// 再讀取（跟 scrape-vixtwn.js／scrape-nvda.js 踩過的坑類似）。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://tw.stock.yahoo.com/future/WTX&";
const KEY = "台指期近一指數";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll(".price-detail-item")).some(
        (li) => {
          const spans = li.querySelectorAll("span");
          return spans[0]?.textContent.trim() === "成交" && spans[1]?.textContent.trim();
        }
      ),
    { timeout: 20000 }
  );

  const text = await page.evaluate(() => {
    const li = Array.from(
      document.querySelectorAll(".price-detail-item")
    ).find((el) => el.querySelectorAll("span")[0]?.textContent.trim() === "成交");
    return li?.querySelectorAll("span")[1]?.textContent.trim();
  });

  await browser.close();

  if (!text) {
    throw new Error("找不到成交價，頁面結構可能已變更");
  }

  const value = parseFloat(text.replace(/,/g, ""));
  if (Number.isNaN(value)) {
    throw new Error(`無法解析數值「${text}」，頁面結構可能已變更`);
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
