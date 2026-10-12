// 抓取 MoneyDJ NVIDIA (NVDA) 股價
// https://www.moneydj.com/us/basic/basic0002/nvda
//
// 這頁的報價表格（#infotable）要等頁面 JS 解析網址列的股票代碼、
// 非同步渲染完成才會有資料，一開始是空的，需等到「成交」那一列真的
// 有值再讀取（跟 scrape-vixtwn.js 踩過的坑類似）。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.moneydj.com/us/basic/basic0002/nvda";
const KEY = "NVIDIA股價";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("#infotable tr")).some((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td")).map((c) =>
          c.innerText.trim()
        );
        return cells[0] === "成交" && cells[1] !== "";
      }),
    { timeout: 20000 }
  );

  const rows = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#infotable tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th, td")).map((cell) =>
        cell.innerText.trim()
      )
    )
  );

  await browser.close();

  const row = rows.find((r) => r[0] === "成交");
  if (!row) {
    throw new Error("找不到成交價這一列，頁面結構可能已變更");
  }

  const value = parseFloat(row[1]);
  if (Number.isNaN(value)) {
    throw new Error(`無法解析數值「${row[1]}」，頁面結構可能已變更`);
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
