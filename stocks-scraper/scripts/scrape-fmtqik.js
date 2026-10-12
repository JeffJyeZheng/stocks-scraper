// 抓取台灣證交所「每日市場成交資訊」(fmtqik)
// https://www.twse.com.tw/zh/trading/historical/fmtqik.html
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://www.twse.com.tw/zh/trading/historical/fmtqik.html";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("table");

  const result = await page.evaluate(() => {
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

  const outputPath = writeSourceData("每日市場成交資訊", { header, rows: body });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
