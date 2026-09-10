import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@polylove/ui";
import { api, useData } from "./api";
import { Form, Password, field, Message } from "./shared";
export function Auth({ path }: { path: string }) {
  const me=useData('/me');
  const delivery=useData('/auth/delivery',path==='/verify-email'&&!!me.data);
  const providers = useData("/auth/providers"),
    token = new URLSearchParams(location.search).get("token");
  const titles: any = {
    "/register": "เริ่มเข้าใจตลาดไปด้วยกัน",
    "/login": "กลับมาดูตลาดของคุณ",
    "/verify-email": "ยืนยันอีเมล",
    "/forgot-password": "ลืมรหัสผ่าน?",
    "/reset-password": "ตั้งรหัสผ่านใหม่",
  };
  return (
    <section className="auth">
      <a href="/" className="back">
        กลับหน้าแรก
      </a>
      <Buddy className="auth-buddy" />
      <h1>{titles[path]}</h1>
      <p>พื้นที่ติดตามตลาดที่คุณเลือกได้เอง</p>
      {path==='/verify-email'&&delivery.data&&<Message error={['failed','uncertain','expired'].includes(delivery.data.status)}>สถานะอีเมลล่าสุด: {({queued:'รอส่ง',sending:'กำลังส่ง',sent:'ส่งแล้ว กรุณาตรวจกล่องจดหมาย',failed:'ส่งไม่สำเร็จ กรุณาขอลิงก์ใหม่',uncertain:'ยังยืนยันผลการส่งไม่ได้ กรุณาตรวจอีเมลก่อนขอใหม่',expired:'ลิงก์หมดอายุ กรุณาขอใหม่',cancelled:'ลิงก์เดิมถูกยกเลิก',none:'ยังไม่มีรายการ'} as any)[delivery.data.status]??delivery.data.status}{delivery.data.last_error?' — ผู้ดูแลได้รับสถานะปัญหานี้แล้ว':''}</Message>}
      {["/register", "/login"].includes(path) && (
        <>
          <a
            className={"google " + (!providers.data?.google ? "disabled" : "")}
            href={providers.data?.google ? "/api/v1/auth/google" : undefined}
            aria-disabled={!providers.data?.google}
          >
            ดำเนินการต่อด้วย Google
          </a>
          {providers.data && !providers.data.google && (
            <small>Google Login ยังไม่เปิดใช้งาน สมัครด้วยอีเมลได้</small>
          )}
          <div className="divider">หรือใช้อีเมล</div>
        </>
      )}
      <Form
        label={
          path === "/register"
            ? "สมัครสมาชิก"
            : path === "/login"
              ? "เข้าสู่ระบบ"
              : path === "/verify-email" && token
                ? "ยืนยันอีเมล"
                : "ดำเนินการต่อ"
        }
        onSubmit={async (f) => {
          if (path === "/login") {
            const u = await api("/auth/login", {
              email: field(f, "email"),
              password: field(f, "password"),
            });
            location.href = u.verified ? (u.next ?? "/app") : "/verify-email";
            return;
          }
          if (path === "/register")
            return api("/auth/register", {
              name: field(f, "name"),
              email: field(f, "email"),
              password: field(f, "password"),
              acceptTerms: f.get("acceptTerms") === "on",
            });
          if (path === "/verify-email")
            return token
              ? api("/auth/verify-email", { token })
              : api("/auth/resend-verification", { email: field(f, "email") });
          if (path === "/forgot-password")
            return api("/auth/forgot-password", { email: field(f, "email") });
          return api("/auth/reset-password", {
            token,
            password: field(f, "password"),
          });
        }}
      >
        {path === "/register" && (
          <label>
            ชื่อที่แสดง
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        )}
        {!token && path !== "/reset-password" && (
          <label>
            อีเมล
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
        )}
        {["/login", "/register", "/reset-password"].includes(path) && (
          <Password newPassword={path !== "/login"} />
        )}{" "}
        {path === "/register" && (
          <label className="check">
            <input name="acceptTerms" type="checkbox" required />
            <span>
              ยอมรับ <a href="/terms">เงื่อนไขบริการ</a> และรับทราบ{" "}
              <a href="/privacy">นโยบายความเป็นส่วนตัว</a>
            </span>
          </label>
        )}
        {path === "/verify-email" && token && (
          <p>กดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ</p>
        )}
      </Form>
      <div className="auth-links">
        <a href="/login">เข้าสู่ระบบ</a>
        <a href="/register">สมัครสมาชิก</a>
        <a href="/forgot-password">ลืมรหัสผ่าน</a>
        {path === "/verify-email" && (
          <a href="/verify-email">ขอลิงก์ยืนยันใหม่</a>
        )}
      </div>
    </section>
  );
}
export function Account({ user }: { user: any }) {
  const qc = useQueryClient(),
    token = new URLSearchParams(location.search).get("token");
  return (
    <>
      <h1>บัญชีของฉัน</h1>
      <p>{user.email} · ยืนยันอีเมลแล้ว</p>
      <div className="account-grid">
        <Card>
          <h2>ข้อมูลและเวลาพัก</h2>
          <Form
            onSubmit={async (f) => {
              const r = await api(
                "/me",
                {
                  name: field(f, "name"),
                  quiet_start:
                    field(f, "quiet_start") === ""
                      ? null
                      : Number(f.get("quiet_start")),
                  quiet_end:
                    field(f, "quiet_end") === ""
                      ? null
                      : Number(f.get("quiet_end")),
                  analysis_notifications:
                    f.get("analysis_notifications") === "on",
                },
                "PATCH",
              );
              await qc.invalidateQueries({ queryKey: ["/me"] });
              return r;
            }}
          >
            <label>
              ชื่อที่แสดง
              <input name="name" required defaultValue={user.name} />
            </label>
            <div className="form-grid">
              {["quiet_start", "quiet_end"].map((k, i) => (
                <label key={k}>
                  {i ? "สิ้นสุดพัก" : "เริ่มพัก"}
                  <select name={k} defaultValue={user[k] ?? ""}>
                    <option value="">ไม่กำหนด</option>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option value={h} key={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <small>เขตเวลา Asia/Bangkok</small>
            <label className="check">
              <input
                name="analysis_notifications"
                type="checkbox"
                defaultChecked={user.analysis_notifications}
              />
              รับแจ้งบทวิเคราะห์ใหม่
            </label>
          </Form>
          <h3>Telegram</h3>
          <p>
            {user.telegram_connected ? "เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}
          </p>
          <Form
            label={
              user.telegram_connected ? "ยกเลิกการเชื่อม" : "เชื่อม Telegram"
            }
            onSubmit={async () => {
              if (user.telegram_connected) {
                await api("/telegram/link", {}, "DELETE");
                await qc.invalidateQueries({ queryKey: ["/me"] });
              } else {
                const r = await api("/telegram/link", {});
                location.href = r.url;
              }
            }}
          />
        </Card>
        <Card>
          <h2>การเข้าสู่ระบบ</h2>
          {user.has_password ? (
            <Form
              label="เปลี่ยนรหัสผ่าน"
              onSubmit={async (f) => {
                const r = await api("/auth/change-password", {
                  currentPassword: field(f, "currentPassword"),
                  password: field(f, "password"),
                });
                location.href = "/login";
                return r;
              }}
            >
              <Password name="currentPassword" label="รหัสผ่านปัจจุบัน" />
              <Password newPassword label="รหัสผ่านใหม่" />
            </Form>
          ) : token ? (
            <Form
              label="ยืนยันเพิ่มรหัสผ่าน"
              onSubmit={async (f) => {
                const r = await api("/auth/set-password/confirm", {
                  token,
                  password: field(f, "password"),
                });
                location.href = "/login";
                return r;
              }}
            >
              <Password newPassword />
            </Form>
          ) : (
            <>
              <p>บัญชีนี้เข้าสู่ระบบด้วย Google</p>
              <a className="google" href="/api/v1/auth/google?mode=reauth">
                ยืนยัน Google อีกครั้ง
              </a>
              <Form
                label="ส่งลิงก์เพิ่มรหัสผ่าน"
                onSubmit={() => api("/auth/set-password/request", {})}
              />
            </>
          )}
          <h3>Google</h3>
          {user.has_google ? (
            <>
              <p>เชื่อมต่อแล้ว</p>
              {user.has_password && (
                <Form
                  label="ถอด Google"
                  onSubmit={async (f) => {
                    await api(
                      "/auth/google",
                      { password: field(f, "password") },
                      "DELETE",
                    );
                    await qc.invalidateQueries({ queryKey: ["/me"] });
                  }}
                >
                  <Password label="ยืนยันรหัสผ่านเพื่อถอด Google" />
                </Form>
              )}
            </>
          ) : (
            <a className="google" href="/api/v1/auth/google?mode=link">
              เชื่อม Google กับบัญชีนี้
            </a>
          )}
          <hr />
          <Form
            label="ออกจากระบบ"
            onSubmit={async () => {
              await api("/auth/logout", {});
              location.href = "/";
            }}
          />
        </Card>
      </div>
      <details className="danger">
        <summary>ลบบัญชีของฉัน</summary>
        <p>บัญชี เหรียญที่ติดตาม และแจ้งเตือนจะถูกลบ พิมพ์อีเมลเพื่อยืนยัน</p>
        <Form
          label="ลบบัญชีถาวร"
          onSubmit={async (f) => {
            await api("/me", { confirm: field(f, "confirm") }, "DELETE");
            location.href = "/";
          }}
        >
          <label>
            อีเมลยืนยัน
            <input name="confirm" type="email" required />
          </label>
        </Form>
      </details>
    </>
  );
}
import { Buddy } from "../beginner/illustrations";
