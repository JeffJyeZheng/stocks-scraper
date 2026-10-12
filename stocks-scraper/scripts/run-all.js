const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SCRIPTS_DIR = __dirname;

const files = fs
  .readdirSync(SCRIPTS_DIR)
  .filter((f) => f.startsWith("scrape-") && f.endsWith(".js"))
  .sort();

// 單一腳本失敗時不中斷，繼續執行其餘腳本，最後統一列出失敗清單
const failed = [];

for (const file of files) {
  console.log(`\n=== 執行 ${file} ===`);
  try {
    execFileSync("node", [path.join(SCRIPTS_DIR, file)], { stdio: "inherit" });
  } catch {
    failed.push(file);
  }
}

console.log(
  `\n=== 完成：成功 ${files.length - failed.length} 支，失敗 ${failed.length} 支 ===`
);
if (failed.length > 0) {
  failed.forEach((f) => console.log(`  失敗：${f}`));
  process.exitCode = 1;
}
