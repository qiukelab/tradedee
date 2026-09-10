import { Card } from "@polylove/ui";
import { useData } from "./api";
import { dateText, priceText, shortSymbol, symbols } from "./model";
import { Empty, Message } from "./shared";
export function MarketCards() {
  const q = useData("/assets");
  return (
    <>
      {q.error && (
        <Message error>
          โหลดราคาไม่ได้ <button onClick={() => q.refetch()}>ลองใหม่</button>
        </Message>
      )}
      <div className="market-grid">
        {(
          q.data?.items ??
          symbols.map((symbol) => ({
            symbol,
            name: (
              {
                BTCUSDT: "Bitcoin",
                ETHUSDT: "Ethereum",
                SOLUSDT: "Solana",
              } as any
            )[symbol],
          }))
        ).map((a: any) => (
          <a
            className="market-card"
            key={a.symbol}
            href={"/app/assets/" + a.symbol}
          >
            <div className="row">
              <span className={"coin " + shortSymbol(a.symbol).toLowerCase()}>
                {shortSymbol(a.symbol).slice(0, 1)}
              </span>
              <div>
                <strong>{a.name}</strong>
                <small>{shortSymbol(a.symbol)} / USDT</small>
              </div>
              <span
                className={
                  a.change == null
                    ? "muted"
                    : a.change >= 0
                      ? "positive"
                      : "negative"
                }
              >
                {a.change == null
                  ? "—"
                  : `${a.change >= 0 ? "+" : ""}${a.change.toFixed(2)}%`}
              </span>
            </div>
            <p className="price">
              {priceText(a.price)}
              <small> USDT</small>
            </p>
            <small>
              {a.stale ? "ข้อมูลล้าสมัย · " : ""}
              {dateText(a.as_of)}
            </small>
          </a>
        ))}
      </div>
    </>
  );
}
export function NewsItems({ items }: { items: any[] }) {
  return items.length ? (
    <div className="news-list">
      {items.map((n) => (
        <article key={n.id}>
          <div className="row">
            <span className="tag">
              {n.symbols?.map(shortSymbol).join(" / ")}
            </span>
            <small>{dateText(n.published_at)}</small>
          </div>
          <h3>{n.title}</h3>
          <p>{n.summary}</p>
          <a href={n.url} target="_blank" rel="noreferrer">
            อ่านแหล่งต้นทาง
          </a>
        </article>
      ))}
    </div>
  ) : (
    <Empty>ยังไม่มีข่าวที่เผยแพร่ เมื่อผู้ดูแลเพิ่มข่าวจะแสดงที่นี่</Empty>
  );
}
export function AnalysisItems({ items }: { items: any[] }) {
  return items.length ? (
    <div className="analysis-list">
      {items.map((a) => (
        <Card key={a.id}>
          <div className="row">
            <strong>{shortSymbol(a.symbol)}</strong>
            <span className="tag">
              {(
                {
                  published: "ผ่านการตรวจแล้ว",
                  expired: "หมดอายุ",
                  withdrawn: "ถอนเผยแพร่",
                  invalidated: "ยกเลิกเงื่อนไข",
                } as any
              )[a.status] ?? a.status}
            </span>
          </div>
          <h3>{a.body.summary}</h3>
          <small>
            ข้อมูล ณ {dateText(a.as_of)} · ตรวจโดย{" "}
            {a.reviewer_name ?? "ผู้ดูแล"}
          </small>
          <details>
            <summary>เหตุผลและแผนที่ควรติดตาม</summary>
            <h4>มุมมอง AI</h4>
            <p>ปัจจัยบวก: {a.body.positive?.join(" / ") || "ยังไม่มี"}</p>
            <p>ปัจจัยลบ: {a.body.negative?.join(" / ") || "ยังไม่มี"}</p>
            <p>ข้อจำกัด: {a.body.limitations?.join(" / ")}</p>
            {a.metrics.plan && !a.body.wait && a.status === "published" ? (
              <div className="plan-grid">
                <p>
                  รอทะลุจุดเข้า
                  <strong>{priceText(a.metrics.plan.entry)}</strong>
                </p>
                <p>
                  ตัดขาดทุน<strong>{priceText(a.metrics.plan.stop)}</strong>
                </p>
                <p>
                  เป้าหมาย<strong>{priceText(a.metrics.plan.target)}</strong>
                </p>
              </div>
            ) : (
              <Message>
                {a.status === "published"
                  ? "รอดูสถานการณ์"
                  : "แผนนี้ไม่อยู่ในสถานะพร้อมใช้งาน"}
              </Message>
            )}
            <p>หมดอายุ {dateText(a.expires_at)} · หน่วย USDT</p>
            <h4>ข้อเท็จจริงจากแท่งเทียน</h4>
            <p>
              RSI {a.metrics.rsi14?.toFixed(1)} · Volume{" "}
              {a.metrics.volume_ratio?.toFixed(2)} เท่าของค่าเฉลี่ย
            </p>
            {a.sources?.map((n: any) => (
              <p key={n.id}>
                <a href={n.url} target="_blank" rel="noreferrer">
                  {n.title}
                </a>
              </p>
            ))}
          </details>
        </Card>
      ))}
    </div>
  ) : (
    <Empty>ยังไม่มีบทวิเคราะห์ที่ผ่านการอนุมัติ</Empty>
  );
}
export function JobList({ items }: { items: any[] }) {
  return items.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>เวลา</th>
            <th>ช่องทาง</th>
            <th>สถานะ</th>
            <th>รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {items.map((j) => (
            <tr key={j.id}>
              <td>{dateText(j.created_at)}</td>
              <td>{j.kind}</td>
              <td>{j.status}</td>
              <td>{j.last_error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>ยังไม่มีประวัติการส่ง</Empty>
  );
}
