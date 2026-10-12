// 抓取 MoneyDJ 融資融券明細（上市 + 上櫃）
// https://5850web.moneydj.com/z/zb/zbc/zbc.djhtm
//
// 兩個區塊在同一張 table 裡，各佔 6 列：
// [0] 標題列（例："‧115/09/17~115/09/17 上市融資融券明細"）
// [1] 融資小表表頭　[2][3] 融資張數/金額資料列
// [4] 融券小表表頭　[5]    融券張數資料列
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://5850web.moneydj.com/z/zb/zbc/zbc.djhtm";
const SECTIONS = ["上市融資融券明細", "上櫃融資融券明細"];

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("table");

  const rows = await page.evaluate((labels) => {
    // 這頁是舊式巢狀 table 排版，外層 table 的 innerText 也會包含內層文字，
    // 所以不能直接用 innerText.includes 找 table（會抓到外層排版用的 table）。
    // 改成先找出標題文字所在的儲存格，再往上找最近的 table（即實際資料表）。
    // 只找「葉節點」的 td（本身沒有子元素），避免抓到外層巢狀 table 的包裝儲存格
    // （那種儲存格的 textContent 也會因為包住內層 table 而『包含』標題文字）
    const headingCell = Array.from(document.querySelectorAll("td")).find(
      (el) => el.children.length === 0 && el.textContent.trim().includes(labels[0])
    );
    const target = headingCell?.closest("table");
    if (!target) return null;

    return Array.from(target.querySelectorAll("tr"))
      .map((tr) =>
        Array.from(tr.querySelectorAll("th, td")).map((cell) =>
          cell.innerText.trim()
        )
      )
      .filter((row) => row.length > 0 && row.some((cell) => cell !== ""));
  }, SECTIONS);

  await browser.close();

  if (!rows || rows.length === 0) {
    throw new Error("找不到融資融券明細表，頁面結構可能已變更");
  }

  return rows;
}

function extractSection(rows, label) {
  const startIndex = rows.findIndex((row) => row[0]?.includes(label));
  if (startIndex === -1 || startIndex + 5 >= rows.length) {
    throw new Error(`找不到「${label}」區塊，頁面結構可能已變更`);
  }

  return {
    date: rows[startIndex][0],
    融資: {
      header: rows[startIndex + 1],
      rows: [rows[startIndex + 2], rows[startIndex + 3]],
    },
    融券: {
      header: rows[startIndex + 4],
      rows: [rows[startIndex + 5]],
    },
  };
}

async function main() {
  const rows = await scrape();

  for (const label of SECTIONS) {
    const section = extractSection(rows, label);
    console.log(`--- ${label} ---`);
    console.log(section);

    const outputPath = writeSourceData(label, section);
    console.log(`已存檔：${outputPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
