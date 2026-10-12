const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "..", "data");

function getOutputPath() {
  const dateStr = new Date().toISOString().slice(0, 10);
  return path.join(OUTPUT_DIR, `source-data-${dateStr}.json`);
}

// 把 { [key]: value } 合併進當天的 source-data-<日期>.json，不覆蓋其他 key 已寫入的資料
function writeSourceData(key, value) {
  const outputPath = getOutputPath();

  let existing = {};
  if (fs.existsSync(outputPath)) {
    existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
  }

  const merged = { ...existing, [key]: value };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), "utf-8");

  return outputPath;
}

module.exports = { writeSourceData };
