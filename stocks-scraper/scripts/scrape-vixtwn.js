// 抓取台灣期貨交易所行情資訊網「波動率指數」報價中的「臺指選擇權波動率指數」
// https://mis.taifex.com.tw/futures/VolatilityQuotes
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://mis.taifex.com.tw/futures/VolatilityQuotes";
const KEY = "臺指選擇權波動率指數";

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });

  // 進站前的聲明事項彈窗，須先點「接受」才會顯示報價表格
  await page.getByRole("button", { name: "接受", exact: true }).click();
  await page.waitForSelector("table");
  // 表格本身會先渲染成空殼，報價數據是之後才非同步填入的，
  // 需等到目標列真的有值才能往下抓，否則會抓到空字串
  await page.waitForFunction(
    (key) =>
      Array.from(document.querySelectorAll("table tr")).some((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td")).map((c) =>
          c.innerText.trim()
        );
        return cells[0] === key && cells[1] !== "";
      }),
    KEY,
    { timeout: 15000 }
  );

  const rows = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const target = tables.reduce((best, t) => {
      const rowCount = t.querySelectorAll("tr").length;
      return rowCount > (best?.rowCount ?? 0) ? { table: t, rowCount } : best;
    }, null)?.table;

    if (!target) return null;

    return Array.from(target.querySelectorAll("tr"))
      .map((tr) =>
        Array.from(tr.querySelectorAll("th, td")).map((cell) =>
          cell.innerText.trim()
        )
      )
      .filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
  });

  await browser.close();

  if (!rows || rows.length === 0) {
    throw new Error("找不到資料表，頁面結構可能已變更");
  }

  const header = rows[0];
  const targetRow = rows.find((row) => row[0] === KEY);
  if (!targetRow) {
    throw new Error(`找不到「${KEY}」這一列，頁面結構可能已變更`);
  }

  const valueIndex = header.indexOf("目前指數");
  const value = parseFloat(targetRow[valueIndex === -1 ? 1 : valueIndex]);
  if (Number.isNaN(value)) {
    throw new Error(`無法解析數值「${targetRow[1]}」，頁面結構可能已變更`);
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
