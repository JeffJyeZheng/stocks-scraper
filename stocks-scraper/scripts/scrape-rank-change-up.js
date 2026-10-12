// 抓取 Yahoo 股市台股上市漲幅排行
// https://tw.stock.yahoo.com/rank/change-up?exchange=TAI
//
// 這頁不是用 <table> 呈現，而是 <ul class="List(n)"> 底下一排 <li>，
// 每個 li 的 innerText 用換行分隔各欄位：名次/股名/股號/股價/漲跌/漲跌幅%/
// 最高/最低/價差/成交量(張)/成交金額(億)，剛好對應頁面上顯示的欄位。
const { chromium } = require("@playwright/test");
const { writeSourceData } = require("./lib/write-source-data");

const URL = "https://tw.stock.yahoo.com/rank/change-up?exchange=TAI";
const HEADER = [
  "名次",
  "股名",
  "股號",
  "股價",
  "漲跌",
  "漲跌幅%",
  "最高",
  "最低",
  "價差",
  "成交量(張)",
  "成交金額(億)",
];

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".table-body-wrapper ul.List\\(n\\) li");

  const rows = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(".table-body-wrapper ul.List\\(n\\) > li")
    ).map((li, index) => {
      // 第一名的名次是用圖示/徽章呈現、不是純文字，innerText 裡不會有
      // 「1」這個欄位，導致該列比其他列少一欄。用 li 在清單中的順序
      // (index + 1) 當名次，並只取最後 10 個欄位當作股票資料，
      // 不管原始文字裡有沒有名次都能對齊。
      const fields = li.innerText.split("\n");
      const dataFields = fields.slice(-10);
      return [String(index + 1), ...dataFields];
    })
  );

  await browser.close();

  if (!rows || rows.length === 0) {
    throw new Error("找不到排行榜資料，頁面結構可能已變更");
  }

  return rows;
}

async function main() {
  const rows = await scrape();

  console.log("欄位：", HEADER);
  console.log(`共 ${rows.length} 筆資料`);
  rows.forEach((row) => console.log(row));

  const outputPath = writeSourceData("上市漲幅排行", { header: HEADER, rows });
  console.log(`已存檔：${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
