export type Locale = "th" | "en";
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const copy = {
  th: {
    overview: "ภาพรวม", markets: "ตลาด", signals: "สัญญาณ", model: "โมเดล", settings: "ตั้งค่า",
    search: "ค้นหาตลาด (Ctrl+K)", paperTrade: "Paper Trade", liveMarkets: "ตลาด Polymarket สด",
    featured: "ตลาดเด่น", marketProbability: "ความน่าจะเป็นตลาด", liquidity: "สภาพคล่อง",
    volume: "ปริมาณ 24 ชม.", spread: "ส่วนต่าง", movers: "ตลาดที่ขยับ", dataFresh: "ข้อมูลล่าสุด",
    dataStale: "กำลังแสดงข้อมูลจาก cache ล่าสุด", retry: "ลองใหม่", empty: "ยังไม่มีตลาดที่ตรงกับตัวกรอง",
    loading: "กำลังโหลดข้อมูลตลาด", error: "ไม่สามารถโหลดข้อมูลตลาดได้", source: "ต้นฉบับ", noForecast: "ยังไม่มี fair value ที่ผ่านการปรับเทียบ",
    terminal: "Prediction intelligence terminal", active: "ใช้งานอยู่", market: "ตลาด", change: "เปลี่ยนแปลง 1 วัน", closes: "ปิดตลาด",
    connected: "เชื่อมต่อ Gamma", paperOnly: "จำลองการลงทุนเท่านั้น", rows: "รายการ",
  },
  en: {
    overview: "Overview", markets: "Markets", signals: "Signals", model: "Model", settings: "Settings",
    search: "Search markets (Ctrl+K)", paperTrade: "Paper Trade", liveMarkets: "Live Polymarket markets",
    featured: "Featured market", marketProbability: "Market probability", liquidity: "Liquidity",
    volume: "24h volume", spread: "Spread", movers: "Market movers", dataFresh: "Fresh data",
    dataStale: "Showing the latest cached market data", retry: "Retry", empty: "No markets match this filter",
    loading: "Loading market data", error: "Unable to load market data", source: "Source", noForecast: "No calibrated fair value yet",
    terminal: "Prediction intelligence terminal", active: "Active", market: "Market", change: "1d change", closes: "Closes",
    connected: "Gamma connected", paperOnly: "Paper trading only", rows: "rows",
  },
} as const;

export type CopyKey = keyof typeof copy.th;
export function t(locale: Locale, key: CopyKey): string { return copy[locale][key]; }
export function readLocale(storage: Pick<Storage, "getItem">): Locale { return storage.getItem("polylove:locale") === "en" ? "en" : "th"; }
export function writeLocale(storage: StorageLike, locale: Locale): void { storage.setItem("polylove:locale", locale); }
export function activeSection(sections: Array<{ id: string; top: number }>): string {
  return sections.reduce((best, section) => Math.abs(section.top) < Math.abs(best.top) ? section : best, sections[0]).id;
}
