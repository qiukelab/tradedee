import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card } from "@polylove/ui";
import { api, useData } from "./api";
import { dateText, priceText, shortSymbol, symbols } from "./model";
import { Empty, Message, Form, field } from "./shared";
import { MarketCards, NewsItems, AnalysisItems, JobList } from "./content";
export function Member({ user, path }: { user: any; path: string }) {
  return (
    <div className="container page">
      <nav className="subnav" aria-label="เมนูสมาชิก">
        {[
          ["/app", "ภาพรวม"],
          ["/app/news", "ข่าวและมุมมอง"],
          ["/app/alerts", "แจ้งเตือน"],
          ["/app/account", "บัญชีของฉัน"],
        ].map(([url, label]) => (
          <a key={url} className={path === url ? "active" : ""} href={url}>
            {label}
          </a>
        ))}
      </nav>
      {location.search.includes("from=legacy") && (
        <Message>TradeDee เป็นพื้นที่วิเคราะห์ Crypto ของคุณ</Message>
      )}
      {path === "/app/alerts" ? (
        <Alerts />
      ) : path.startsWith("/app/assets/") ? (
        <Asset symbol={path.split("/").at(-1)!} />
      ) : path === "/app/news" || path === "/app/analyses" ? (
        <NewsPage />
      ) : (
        <Dashboard user={user} />
      )}
    </div>
  );
}
function Dashboard({ user }: { user: any }) {
  const watch = useData("/watchlist"),
    news = useData("/news"),
    analyses = useData("/analyses"),
    qc = useQueryClient();
  return (
    <>
      <div className="section-title">
        <div>
          <h1>สวัสดี {user.name}</h1>
          <p>เริ่มวันด้วยภาพรวม แล้วค่อยลงรายละเอียด</p>
        </div>
        <span className="tag">ข้อมูลอ้างอิง Binance Spot</span>
      </div>
      <PolyNote>
        เริ่มจากเหรียญที่คุณสนใจสักตัวก็ได้
        ฉันจะช่วยรวมข่าวกับมุมมองไว้ให้ตรงนี้นะ
      </PolyNote>
      <MarketCards />
      <section className="section">
        <h2>เหรียญที่คุณติดตาม</h2>
        <Form
          label="บันทึกเหรียญที่ติดตาม"
          onSubmit={async (f) => {
            const r = await api(
              "/watchlist",
              { symbols: f.getAll("symbols") },
              "PUT",
            );
            await qc.invalidateQueries({ queryKey: ["/watchlist"] });
            return r;
          }}
        >
          <div className="choices" key={watch.data?.symbols?.join(",")}>
            {symbols.map((s) => (
              <label className="check" key={s}>
                <input
                  name="symbols"
                  value={s}
                  type="checkbox"
                  defaultChecked={watch.data?.symbols?.includes(s)}
                />
                {shortSymbol(s)}
              </label>
            ))}
          </div>
        </Form>
        {!user.telegram_connected && (
          <Message>
            รับแจ้งเตือนนอกเว็บได้เมื่อ{" "}
            <a href="/app/account">เชื่อม Telegram</a>
          </Message>
        )}
      </section>
      <h2>มุมมองสำหรับคุณ</h2>
      <AnalysisItems
        items={(analyses.data?.items ?? []).filter(
          (a: any) =>
            !watch.data?.symbols?.length ||
            watch.data.symbols.includes(a.symbol),
        )}
      />
      <h2>ข่าวล่าสุด</h2>
      <NewsItems items={news.data?.items ?? []} />
    </>
  );
}
function NewsPage() {
  const [s, setS] = useState(""),
    [date, setDate] = useState("");
  const news = useData("/news" + (s ? "?symbol=" + s : "")),
    analyses = useData("/analyses" + (s ? "?symbol=" + s : ""));
  const filter = (items: any[], key: string) =>
    items.filter((a) => !date || a[key]?.slice(0, 10) === date);
  return (
    <>
      <h1>ข่าวและมุมมองตลาด</h1>
      <div className="filters">
        <label>
          เหรียญ
          <select value={s} onChange={(e) => setS(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {symbols.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          วันที่
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      {(news.error || analyses.error) && (
        <Message error>โหลดข้อมูลไม่ได้ กรุณาลองใหม่</Message>
      )}
      <h2>บทวิเคราะห์</h2>
      <AnalysisItems items={filter(analyses.data?.items ?? [], "created_at")} />
      <h2>ข่าว</h2>
      <NewsItems items={filter(news.data?.items ?? [], "published_at")} />
    </>
  );
}
function Asset({ symbol: s }: { symbol: string }) {
  const [interval, setInterval] = useState("1h"),
    q = useData(
      `/assets/${s}/candles?interval=${interval}`,
      symbols.includes(s),
    ),
    news = useData("/news?symbol=" + s, symbols.includes(s)),
    analyses = useData("/analyses?symbol=" + s, symbols.includes(s));
  if (!symbols.includes(s)) return <Empty>ไม่พบเหรียญนี้</Empty>;
  const rows = q.data?.items ?? [],
    low = Math.min(...rows.map((r: any) => r.low)),
    high = Math.max(...rows.map((r: any) => r.high)),
    range = high - low || 1,
    maxV = Math.max(...rows.map((r: any) => r.volume), 1);
  return (
    <>
      <h1>{shortSymbol(s)} / USDT</h1>
      <p>ราคาและปริมาณซื้อขายจากแท่งที่ปิดแล้ว · Binance</p>
      <div className="choices">
        {["15m", "1h", "4h"].map((t) => (
          <Button
            variant={interval === t ? "primary" : "outline"}
            key={t}
            onClick={() => setInterval(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {q.error && <Message error>{q.error.message}</Message>}
      {rows.length ? (
        <div className="chart">
          <svg
            viewBox="0 0 800 290"
            role="img"
            aria-label={`กราฟราคา ${s} ${interval} จาก ${priceText(low)} ถึง ${priceText(high)} USDT`}
          >
            <text x="4" y="16">
              {priceText(high)} USDT
            </text>
            <text x="4" y="198">
              {priceText(low)}
            </text>
            <polyline
              fill="none"
              stroke="var(--blue)"
              strokeWidth="2"
              points={rows
                .map(
                  (r: any, i: number) =>
                    `${(i * 800) / Math.max(rows.length - 1, 1)},${30 + ((high - r.close) / range) * 165}`,
                )
                .join(" ")}
            />
            {rows.map((r: any, i: number) => (
              <rect
                key={r.open_time}
                x={(i * 800) / rows.length}
                y={280 - (r.volume / maxV) * 55}
                width={Math.max(1, 800 / rows.length - 1)}
                height={(r.volume / maxV) * 55}
                fill="var(--soft-blue)"
              />
            ))}
          </svg>
          <small>
            ล่าสุด{" "}
            {dateText(new Date(Number(rows.at(-1).close_time)).toISOString())} ·
            Volume ด้านล่าง
          </small>
        </div>
      ) : (
        <Empty>กำลังรอแท่งเทียนจากแหล่งข้อมูล</Empty>
      )}
      <AnalysisItems items={analyses.data?.items ?? []} />
      <h2>ข่าวที่เกี่ยวข้อง</h2>
      <NewsItems items={news.data?.items ?? []} />
    </>
  );
}
function Alerts() {
  const q = useData("/alerts"),
    history = useData("/notifications"),
    qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["/alerts"] });
  return (
    <>
      <h1>แจ้งเตือนของคุณ</h1>
      <p>ส่งครั้งเดียวเมื่อราคาข้ามเงื่อนไข แล้วหยุดจนกว่าคุณจะเปิดใหม่</p>
      <Card>
        <Form
          label="เพิ่มแจ้งเตือน"
          onSubmit={async (f) => {
            const r = await api("/alerts", {
              symbol: field(f, "symbol"),
              direction: field(f, "direction"),
              price: Number(f.get("price")),
            });
            await refresh();
            return r;
          }}
        >
          <div className="form-grid">
            <label>
              เหรียญ
              <select name="symbol">
                {symbols.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              เงื่อนไข
              <select name="direction">
                <option value="above">ขึ้นผ่านราคา</option>
                <option value="below">ลงผ่านราคา</option>
              </select>
            </label>
            <label>
              ราคา USDT
              <input
                name="price"
                type="number"
                min="0.000001"
                step="any"
                required
              />
            </label>
          </div>
        </Form>
      </Card>
      {q.error && <Message error>{q.error.message}</Message>}
      {(q.data?.items ?? []).map((a: any) => (
        <Card key={a.id}>
          <p>
            {a.symbol} {a.direction === "above" ? "ขึ้นผ่าน" : "ลงผ่าน"}{" "}
            {priceText(a.price)} USDT · {a.active ? "เปิดอยู่" : "ปิดอยู่"}
          </p>
          <Form
            label={a.active ? "ปิดแจ้งเตือน" : "เปิดใหม่"}
            onSubmit={async () => {
              await api("/alerts/" + a.id, { active: !a.active }, "PATCH");
              await refresh();
            }}
          />
          <Form
            label="ลบรายการ"
            onSubmit={async () => {
              await api("/alerts/" + a.id, {}, "DELETE");
              await refresh();
            }}
          />
        </Card>
      ))}
      <h2>ประวัติการส่ง</h2>
      <JobList items={history.data?.items ?? []} />
    </>
  );
}
import { PolyNote } from "./story";
