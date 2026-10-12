const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SCRIPTS_DIR = __dirname;

const files = fs
  .readdirSync(SCRIPTS_DIR)
  .filter((f) => f.startsWith("scrape-") && f.endsWith(".js"))
  .sort();

for (const file of files) {
  console.log(`\n=== 執行 ${file} ===`);
  execFileSync("node", [path.join(SCRIPTS_DIR, file)], { stdio: "inherit" });
}
