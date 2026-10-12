// 抓取台灣證交所「三大法人買賣金額統計表」(bfi82u)
// https://www.twse.com.tw/zh/trading/foreign/bfi82u.html
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.twse.com.tw/zh/trading/foreign/bfi82u.html";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("table");

  const result = await page.evaluate(() => {
    // 頁面上可能不只一個 table，取「列數最多」的當作主要資料表
    const tables = Array.from(document.querySelectorAll("table"));
    const target = tables.reduce((best, t) => {
      const rows = t.querySelectorAll("tr").length;
      return rows > (best?.rows ?? 0) ? { table: t, rows } : best;
    }, null)?.table;

    if (!target) return null;

    const rows = Array.from(target.querySelectorAll("tr"))
      .map((tr) =>
        Array.from(tr.querySelectorAll("th, td")).map((cell) =>
          cell.innerText.trim()
        )
      )
      .filter((row) => row.length > 0);

    return rows;
  });

  await browser.close();

  if (!result || result.length === 0) {
    throw new Error("找不到資料表，頁面結構可能已變更");
  }

  return result;
}

async function main() {
  const rows = await scrape();

  const [header, ...body] = rows;
  console.log("欄位：", header);
  console.log(`共 ${body.length} 筆資料`);
  body.forEach((row) => console.log(row));

  const outputPath = writeSourceData("三大法人買賣超", { header, rows: body });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
