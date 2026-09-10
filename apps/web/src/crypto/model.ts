export const priceText = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "รอข้อมูล"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value);
export const legacyDestination = (search: string) =>
  new URLSearchParams(search).has("view") ? "/app" : null;
export const dateText = (value: string | undefined) =>
  value
    ? new Date(value).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "ยังไม่มีข้อมูล";
export const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
export const shortSymbol = (s: string) => s.replace("USDT", "");
