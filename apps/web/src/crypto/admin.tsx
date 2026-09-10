import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "@polylove/ui";
import { api, useData } from "./api";
import { Form, field, Message, Empty } from "./shared";
import { JobList, NewsItems } from "./content";
import { dateText, symbols } from "./model";
export function Admin() {
  const [tab, setTab] = useState("ภาพรวม");
  return (
    <div className="container page">
      <div className="section-title">
        <div>
          <h1>ห้องดูแล TradeDee</h1>
          <p>ข้อมูลที่เชื่อถือได้ เริ่มจากการตรวจสอบที่นี่</p>
        </div>
        <a href="/app">ดูหน้าสมาชิก</a>
      </div>
      <nav className="subnav" aria-label="ส่วนจัดการ">
        {["ภาพรวม", "สมาชิก", "ข่าว", "บทวิเคราะห์", "MCP", "ตั้งค่า", "ประวัติ"].map(
          (t) => (
            <Button
              key={t}
              variant={tab === t ? "primary" : "outline"}
              onClick={() => setTab(t)}
            >
              {t}
            </Button>
          ),
        )}
      </nav>
      {tab === "ภาพรวม" ? (
        <Overview />
      ) : tab === "สมาชิก" ? (
        <Users />
      ) : tab === "ข่าว" ? (
        <NewsAdmin />
      ) : tab === "บทวิเคราะห์" ? (
        <Review />
      ) : tab === "MCP" ? (
        <McpAdmin />
      ) : tab === "ตั้งค่า" ? (
        <Settings />
      ) : (
        <Audit />
      )}
    </div>
  );
}
function McpAdmin() {
  const q = useData('/admin/mcp');
  return <Card>
    <h2>Poly เชื่อมกับผู้ช่วยวิเคราะห์ของคุณ</h2>
    <p>สั่งใน ChatGPT ให้ดึงข่าวและข้อมูลตลาด แล้วส่งผลกลับเป็นร่าง คุณยังเป็นผู้ตรวจและกดเผยแพร่เสมอ</p>
    {q.error && <Message error>{q.error.message}</Message>}
    {q.isPending ? <p>กำลังตรวจสถานะ…</p> : q.data && <>
      <p>OAuth: {q.data.oauth_configured ? 'มีค่าตั้งต้นแล้ว — ยังต้องทดสอบกับ ChatGPT' : 'ยังไม่ได้ตั้งค่าฝั่งเซิร์ฟเวอร์'}</p>
      <label>ที่อยู่ MCP<input readOnly value={q.data.endpoint} onFocus={e => e.currentTarget.select()} /></label>
      <p>การมีที่อยู่นี้ไม่ได้หมายความว่าเชื่อมต่อสำเร็จ ต้องใช้ HTTPS และอนุญาตด้วยบัญชีแอดมินก่อน</p>
      {q.data.development_token_enabled && <Message error>ยังเปิด token ทดสอบอยู่ การตัด OAuth ด้านล่างไม่ยกเลิก token นี้ ให้ผู้ดูแลเซิร์ฟเวอร์นำค่า MCP_ADMIN_TOKEN_SHA256 ออกก่อนเปิดจริง</Message>}
      <h3>สิทธิ์ OAuth ของฉัน</h3>
      {q.data.connections.length ? q.data.connections.map((item: any) => <p key={item.client_id}>{item.client_id} · {item.active_tokens} สิทธิ์ · หมดอายุล่าสุด {dateText(item.expires_at)}</p>) : <p>ไม่มีสิทธิ์ที่ยังใช้งานได้</p>}
      <Form label="ตัดสิทธิ์ OAuth MCP ทั้งหมดของฉัน" onSubmit={async () => { const result = await api('/admin/mcp/revoke', {}); await q.refetch(); return result; }} />
      <p>เครื่องมือที่อนุญาต: อ่านข้อมูลตลาด อ่านข่าว และส่งร่าง ไม่มีสิทธิ์เผยแพร่หรือเข้าถึงข้อมูลสมาชิก</p>
    </>}
  </Card>;
}
function Overview() {
  const q = useData("/admin/jobs");
  return (
    <>
      {q.error && <Message error>{q.error.message}</Message>}
      <div className="market-grid">
        <Card>
          <h2>AI วันนี้</h2>
          <p className="price">
            {Number(q.data?.usage?.daily ?? 0).toFixed(2)}{" "}
            <small>/ 8 บาท</small>
          </p>
        </Card>
        <Card>
          <h2>AI เดือนนี้</h2>
          <p className="price">
            {Number(q.data?.usage?.monthly ?? 0).toFixed(2)}{" "}
            <small>/ 240 บาท</small>
          </p>
        </Card>
        <Card>
          <h2>การเชื่อมต่อ</h2>
          {Object.entries(q.data?.services ?? {}).map(([key, v]) => (
            <p key={key}>
              {key}: {v ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}
            </p>
          ))}
        </Card>
      </div>
      <h2>งานตามเวลา</h2>
      {q.data?.worker?.length ? (
        q.data.worker.map((w: any) => (
          <Message key={w.name} error={!!w.error}>
            {w.name} · สำเร็จล่าสุด {dateText(w.last_success)} {w.error}
          </Message>
        ))
      ) : (
        <Empty>ยังไม่พบ worker ที่ทำงาน</Empty>
      )}
      <h2>คิวและผลการส่ง</h2>
      <JobList items={q.data?.items ?? []} />
      <Form
        label="ส่ง Telegram ทดสอบถึงฉัน"
        onSubmit={() => api("/admin/telegram/test", {})}
      />
    </>
  );
}
function Users() {
  const q = useData("/admin/users"),
    [search, setSearch] = useState(""),
    qc = useQueryClient();
  return (
    <>
      <h2>สมาชิก</h2>
      <label>
        ค้นหาชื่อหรืออีเมล
        <input value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {(q.data?.items ?? [])
        .filter((u: any) =>
          (u.email + " " + u.name).toLowerCase().includes(search.toLowerCase()),
        )
        .map((u: any) => (
          <Card key={u.id}>
            <h3>{u.name}</h3>
            <p>
              {u.email} · {u.verified ? "ยืนยันอีเมลแล้ว" : "รอยืนยัน"} ·{" "}
              {u.has_password ? "Email " : ""}
              {u.has_google ? "Google" : ""} · {u.role}
            </p>
            <Form
              onSubmit={async (f) => {
                await api(
                  "/admin/users/" + u.id,
                  {
                    suspended: f.get("suspended") === "on",
                    alert_limit: Number(f.get("alert_limit")),
                  },
                  "PATCH",
                );
                await qc.invalidateQueries({ queryKey: ["/admin/users"] });
              }}
            >
              <div className="form-grid">
                <label>
                  โควตาแจ้งเตือน
                  <input
                    name="alert_limit"
                    type="number"
                    min="0"
                    max="50"
                    defaultValue={u.alert_limit}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    name="suspended"
                    defaultChecked={u.suspended}
                  />
                  ระงับบัญชี
                </label>
              </div>
            </Form>
            {!u.verified && (
              <Form
                label="ส่งอีเมลยืนยันใหม่"
                onSubmit={() => api("/admin/users/" + u.id + "/verify", {})}
              />
            )}
          </Card>
        ))}
    </>
  );
}
function NewsAdmin() {
  const q = useData("/news"),
    feeds = useData("/admin/feeds"),
    qc = useQueryClient();
  return (
    <>
      <h2>เพิ่มข่าวพร้อมต้นทาง</h2>
      <Card>
        <Form
          label="เผยแพร่ข่าว"
          onSubmit={async (f) => {
            await api("/admin/news", {
              title: field(f, "title"),
              summary: field(f, "summary"),
              url: field(f, "url"),
              symbols: f.getAll("symbols"),
              published_at: new Date(field(f, "published_at")).toISOString(),
            });
            await qc.invalidateQueries({ queryKey: ["/news"] });
          }}
        >
          <label>
            หัวข้อ
            <input name="title" required maxLength={200} />
          </label>
          <label>
            สรุปที่เขียนเองหรือมีสิทธิ์ใช้งาน
            <textarea name="summary" required maxLength={5000} />
          </label>
          <div className="form-grid">
            <label>
              แหล่งต้นทาง HTTPS
              <input type="url" name="url" required />
            </label>
            <label>
              เวลาข่าว
              <input name="published_at" type="datetime-local" required />
            </label>
          </div>
          <div className="choices">
            {symbols.map((s) => (
              <label className="check" key={s}>
                <input name="symbols" type="checkbox" value={s} />
                {s}
              </label>
            ))}
          </div>
        </Form>
      </Card>
      <details>
        <summary>จัดการฟีดข่าวที่มีสิทธิ์ใช้งาน</summary>
        <Form
          label="เพิ่มฟีด"
          onSubmit={async (f) => {
            await api("/admin/feeds", {
              name: field(f, "name"),
              url: field(f, "url"),
              licensed: f.get("licensed") === "on",
              enabled: true,
            });
            await qc.invalidateQueries({ queryKey: ["/admin/feeds"] });
          }}
        >
          <label>
            ชื่อแหล่งข้อมูล
            <input name="name" required />
          </label>
          <label>
            RSS/Atom HTTPS URL
            <input name="url" type="url" required />
          </label>
          <label className="check">
            <input name="licensed" type="checkbox" required />
            ยืนยันสิทธิ์แสดงเนื้อหาและใช้กับ AI แล้ว
          </label>
        </Form>
        {feeds.data?.items?.map((f: any) => (
          <div key={f.id}>
            <p>
              {f.name} · {f.enabled ? "เปิด" : "ปิด"} {f.last_error}
            </p>
            <Form
              label={f.enabled ? "ปิดฟีด" : "เปิดฟีด"}
              onSubmit={async () => {
                await api(
                  "/admin/feeds/" + f.id,
                  { enabled: !f.enabled },
                  "PATCH",
                );
                await qc.invalidateQueries({ queryKey: ["/admin/feeds"] });
              }}
            />
          </div>
        ))}
      </details>
      <NewsItems items={q.data?.items ?? []} />
    </>
  );
}
function Review() {
  const q = useData("/admin/analyses"),
    news = useData("/news"),
    qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["/admin/analyses"] });
  return (
    <>
      <div className="section-title">
        <h2>บทวิเคราะห์และร่างรอตรวจ</h2>
        <Form
          label="สร้างร่าง AI รอบใหม่"
          onSubmit={() => api("/admin/analyses/generate", {})}
        />
      </div>
      <p>
        ร่างใหม่จะปรากฏเมื่อ worker ทำงาน หากยังไม่ตั้งค่า AI ให้ตรวจที่ภาพรวม
      </p>
      {q.error && <Message error>{q.error.message}</Message>}
      {!q.data?.items?.length && <Empty>ยังไม่มีร่างบทวิเคราะห์</Empty>}
      {q.data?.items?.map((a: any) => (
        <Card key={a.id + ":" + a.version}>
          <div className="row">
            <h3>{a.symbol}</h3>
            <span className="tag">
              {a.status} · เวอร์ชัน {a.version}
            </span>
          </div>
          <small>
            ข้อมูล {dateText(a.as_of)} · หมดอายุ {dateText(a.expires_at)}
          </small>
          <p>
            ค่าคำนวณ: EMA9 {a.metrics.ema9?.toFixed(2)} / EMA21{" "}
            {a.metrics.ema21?.toFixed(2)} / RSI {a.metrics.rsi14?.toFixed(1)}
          </p>
          {a.metrics.plan && (
            <p>
              เข้า {a.metrics.plan.entry} · stop {a.metrics.plan.stop} ·
              เป้าหมาย {a.metrics.plan.target}
            </p>
          )}
          <Form
            label="บันทึกเป็นร่างใหม่"
            onSubmit={async (f) => {
              const split = (k: string) =>
                field(f, k)
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean);
              await api(
                "/admin/analyses/" + a.id,
                {
                  summary: field(f, "summary"),
                  positive: split("positive"),
                  negative: split("negative"),
                  limitations: split("limitations"),
                  source_ids: f.getAll("source_ids"),
                  wait: f.get("wait") === "on",
                },
                "PATCH",
              );
              await refresh();
            }}
          >
            <label>
              สรุป
              <textarea name="summary" required defaultValue={a.body.summary} />
            </label>
            <div className="form-grid">
              {[
                ["positive", "ปัจจัยบวก"],
                ["negative", "ปัจจัยลบ"],
                ["limitations", "ข้อจำกัด"],
              ].map(([k, label]) => (
                <label key={k}>
                  {label} (หนึ่งข้อ/บรรทัด)
                  <textarea name={k} defaultValue={a.body[k]?.join("\n")} />
                </label>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" name="wait" defaultChecked={a.body.wait} />
              ให้รอดูสถานการณ์
            </label>
            <details>
              <summary>แหล่งอ้างอิงที่ใช้</summary>
              {news.data?.items?.map((n: any) => (
                <label className="check" key={n.id}>
                  <input
                    type="checkbox"
                    name="source_ids"
                    value={n.id}
                    defaultChecked={a.body.source_ids?.includes(n.id)}
                  />
                  <span>
                    {n.title}{" "}
                    <a href={n.url} target="_blank" rel="noreferrer">
                      ต้นทาง
                    </a>
                  </span>
                </label>
              ))}
            </details>
          </Form>
          <div className="review-actions">
            {(a.status === "draft"
              ? [
                  ["publish", "อนุมัติและเผยแพร่"],
                  ["reject", "ปฏิเสธ"],
                ]
              : a.status === "published"
                ? [["withdraw", "ถอนเผยแพร่"]]
                : []
            ).map(([action, label]) => (
              <Form
                key={action}
                label={label}
                onSubmit={async () => {
                  await api("/admin/analyses/" + a.id + "/review", { action });
                  await refresh();
                }}
              />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
function Settings() {
  const q = useData("/admin/settings"),
    assets = useData("/admin/assets"),
    qc = useQueryClient();
  const v = q.data?.value;
  if (!v) return <Empty>กำลังโหลดการตั้งค่า…</Empty>;
  return (
    <>
      <h2>AI และงบประมาณ</h2>
      <Form
        key={q.data.version}
        onSubmit={async (f) => {
          await api(
            "/admin/settings",
            {
              model: field(f, "model"),
              prompt: field(f, "prompt"),
              hours: Number(f.get("hours")),
              daily_budget: Number(f.get("daily_budget")),
              monthly_budget: Number(f.get("monthly_budget")),
              usd_thb: Number(f.get("usd_thb")),
              ai_enabled: f.get("ai_enabled") === "on",
            },
            "PATCH",
          );
          await qc.invalidateQueries({ queryKey: ["/admin/settings"] });
        }}
      >
        <label className="check">
          <input
            name="ai_enabled"
            type="checkbox"
            defaultChecked={v.ai_enabled}
          />
          เปิดงาน AI ตามเวลา
        </label>
        <label>
          โมเดล
          <select name="model" defaultValue={v.model}>
            <option>google/gemini-2.5-flash-lite</option>
          </select>
        </label>
        <label>
          แนวทางการเขียน
          <textarea name="prompt" required defaultValue={v.prompt} />
        </label>
        <div className="form-grid">
          {[
            ["hours", "รอบวิเคราะห์ (ชั่วโมง)", 4, 24],
            ["daily_budget", "งบ/วัน (บาท)", 0, 8],
            ["monthly_budget", "งบ/เดือน (บาท)", 0, 240],
            ["usd_thb", "อัตราสำรอง THB/USD", 30, 100],
          ].map(([k, l, min, max]) => (
            <label key={k}>
              {l}
              <input
                name={String(k)}
                type="number"
                step={k === "hours" ? "1" : "0.01"}
                min={min}
                max={max}
                defaultValue={v[k]}
                required
              />
            </label>
          ))}
        </div>
      </Form>
      <h2>สินทรัพย์ที่เปิดให้ติดตาม</h2>
      {assets.data?.items?.map((a: any) => (
        <Card key={a.symbol}>
          <p>
            {a.symbol} · {a.enabled ? "เปิด" : "ปิด"}
          </p>
          <Form
            label={a.enabled ? "ปิดสินทรัพย์" : "เปิดสินทรัพย์"}
            onSubmit={async () => {
              await api(
                "/admin/assets/" + a.symbol,
                { enabled: !a.enabled },
                "PATCH",
              );
              await qc.invalidateQueries({ queryKey: ["/admin/assets"] });
            }}
          />
        </Card>
      ))}
    </>
  );
}
function Audit() {
  const q = useData("/admin/audit");
  return (
    <>
      <h2>ประวัติการจัดการ</h2>
      {q.data?.items?.map((a: any) => (
        <details key={a.id}>
          <summary>
            {dateText(a.created_at)} · {a.action}
          </summary>
          <p>ผู้ดำเนินการ {a.actor ?? "บัญชีถูกลบ"}</p>
          <pre>{JSON.stringify(a.details, null, 2)}</pre>
        </details>
      ))}
    </>
  );
}
