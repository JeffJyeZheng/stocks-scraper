// 解析 MoneyDJ CZBI.DJBCD 分時資料源：
// "{日期碼} {時間清單(逗號分隔,如 900,905,...,1330)} {指數清單(逗號分隔)} {成交值清單(逗號分隔)}"
function formatTime(raw) {
  const hhmm = raw.padStart(4, "0");
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

// 只保留 09:00-13:30（部分商品的資料源尾端會多帶一筆收盤後快照，例如 14:30）
function parseCzbiBody(text, valueLabel) {
  const parts = text.trim().split(" ");
  if (parts.length < 4) {
    throw new Error("資料格式不符預期，頁面結構可能已變更");
  }

  const times = parts[1].split(",");
  const values = parts[2].split(",");
  const volumes = parts[3].split(",");
  if (
    times.length === 0 ||
    times.length !== values.length ||
    times.length !== volumes.length
  ) {
    throw new Error("時間、指數點數與成交值筆數對不上，頁面結構可能已變更");
  }

  const rows = times
    .map((t, i) => [formatTime(t), values[i], volumes[i]])
    .filter(([time]) => time >= "09:00" && time <= "13:30");

  return { header: ["時間", valueLabel, "成交值(百萬)"], rows };
}

module.exports = { parseCzbiBody };
