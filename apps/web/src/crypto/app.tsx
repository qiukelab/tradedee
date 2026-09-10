import { useEffect, type ReactNode } from "react";
import { Buddy } from "../beginner/illustrations";
import { StoryLanding } from "./story";
import { useData } from "./api";
import { legacyDestination } from "./model";
import { Empty, Message } from "./shared";
import { MarketCards, NewsItems, AnalysisItems } from "./content";
import { Auth, Account } from "./auth";
import { Member } from "./member";
import { Admin } from "./admin";
import "./style.css";
import "./story.css";
function Brand() {
  return (
    <a className="brand" href="/" aria-label="TradeDee หน้าแรก">
      <Buddy className="brand-buddy" />
      TradeDee<span className="beta">ทดลองใช้</span>
    </a>
  );
}
export function App() {
  const me = useData("/me"),
    path = window.location.pathname,
    legacy = legacyDestination(window.location.search);
  useEffect(() => {
    document.title = "TradeDee — เข้าใจตลาดก่อนตัดสินใจ";
    if (legacy) window.location.replace(legacy + "?from=legacy");
  }, [legacy]);
  return (
    <>
      <a className="skip" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <header>
        <div className="container header-inner">
          <Brand />
          <nav aria-label="เมนูหลัก">
            <a href="/#markets">ตลาดวันนี้</a>
            <a href="/app/news">ข่าวและมุมมอง</a>
            {me.data ? (
              <>
                <a href="/app">พื้นที่ของฉัน</a>
                {me.data.role === "admin" && <a href="/admin">หลังบ้าน</a>}
                <a className="pill-link" href="/app/account">
                  {me.data.name}
                </a>
              </>
            ) : (
              <>
                <a href="/login">เข้าสู่ระบบ</a>
                <a className="pill-link" href="/register">
                  เริ่มใช้ฟรี
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main">
        {path === "/" ? (
          <Landing />
        ) : ["/terms", "/privacy"].includes(path) ? (
          <Legal privacy={path === "/privacy"} />
        ) : [
            "/login",
            "/register",
            "/verify-email",
            "/forgot-password",
            "/reset-password",
          ].includes(path) ? (
          <Auth path={path} />
        ) : path.startsWith("/admin") ? (
          <Gate me={me} admin>
            <Admin />
          </Gate>
        ) : path.startsWith("/app") ? (
          <Gate me={me}>
            {path === "/app/account" ? (
              <div className="container page">
                <a href="/app">กลับภาพรวม</a>
                <Account user={me.data} />
              </div>
            ) : (
              <Member user={me.data} path={path} />
            )}
          </Gate>
        ) : (
          <div className="container page">
            <h1>ไม่พบหน้านี้</h1>
            <a href="/">กลับหน้าแรก</a>
          </div>
        )}
      </main>
      <footer className="container">
        <Brand />
        <p>
          อ่านข้อมูลให้รอบด้าน ก่อนตัดสินใจด้วยตัวเอง
          <br />
          <small>
            ข้อมูลอ้างอิง Binance Spot • หน่วย USDT •
            แผนทดลองไม่รับประกันผลตอบแทน
          </small>
        </p>
        <div>
          <a href="/terms">เงื่อนไขบริการ</a>{" "}
          <a href="/privacy">ความเป็นส่วนตัว</a>
        </div>
      </footer>
    </>
  );
}
function Gate({
  me,
  children,
  admin = false,
}: {
  me: any;
  children: ReactNode;
  admin?: boolean;
}) {
  if (me.isPending) return <Empty>กำลังตรวจสอบบัญชี…</Empty>;
  if (!me.data)
    return (
      <section className="auth">
        <h1>พื้นที่สำหรับสมาชิก</h1>
        <p>เข้าสู่ระบบเพื่อเลือกเหรียญและรับการแจ้งเตือนของคุณ</p>
        <a className="pill-link" href="/login">
          เข้าสู่ระบบ
        </a>{" "}
        <a href="/register">สมัครสมาชิก</a>
      </section>
    );
  if (!me.data.verified)
    return (
      <section className="auth">
        <h1>อีกขั้นเดียว ยืนยันอีเมลของคุณ</h1>
        <p>{me.data.email}</p>
        <a href="/verify-email">ไปหน้ายืนยันอีเมล</a>
      </section>
    );
  if (admin && me.data.role !== "admin")
    return <Empty>หน้านี้สำหรับผู้ดูแลระบบ</Empty>;
  return <>{children}</>;
}
const Landing = StoryLanding;
function Legal({ privacy }: { privacy: boolean }) {
  return (
    <section className="container page legal">
      <h1>{privacy ? "ความเป็นส่วนตัว" : "เงื่อนไขบริการทดลอง"}</h1>
      {privacy ? (
        <>
          <p>
            TradeDee เก็บชื่อ อีเมล วิธีเข้าสู่ระบบ เหรียญที่ติดตาม
            และกฎแจ้งเตือนเพื่อให้บริการ บัญชี Google
            ใช้เฉพาะข้อมูลพื้นฐานในการยืนยันตัวตน
          </p>
          <p>
            อีเมลที่เกี่ยวกับบัญชีส่งผ่าน Resend การแจ้งเตือนส่งผ่าน Telegram
            เมื่อคุณเชื่อมบัญชี ข้อมูลที่ส่งให้ AI เป็นข้อมูลตลาดและข่าว
            ไม่ส่งรหัสผ่านหรือรายละเอียดสมาชิก
          </p>
          <p>
            คุณลบบัญชีได้ในหน้าบัญชี สำเนาสำรองถูกเก็บไม่เกินเจ็ดวัน
            ประวัติการจัดการอาจคงอยู่โดยตัดการเชื่อมกับบัญชี
          </p>
        </>
      ) : (
        <>
          <p>
            บริการช่วงทดลองรวบรวมข้อมูล Crypto
            และบทวิเคราะห์ที่ผ่านการตรวจของผู้ดูแล เพื่อประกอบการตัดสินใจ
            แผนที่แสดงเป็นกฎทดลอง ไม่รับประกันกำไร
            และไม่ได้ส่งคำสั่งซื้อขายแทนคุณ
          </p>
          <p>
            ตรวจสอบเวลาข้อมูล แหล่งที่มา และเงื่อนไขของแต่ละแผน
            ราคาที่คุณซื้อขายจริงอาจต่างจากราคาอ้างอิง Binance
          </p>
          <p>
            ช่วงทดลองมีโควตาแจ้งเตือนตามที่แสดงในบัญชี
            และบริการอาจหยุดชั่วคราวเมื่อแหล่งข้อมูลไม่พร้อม
          </p>
        </>
      )}
      <p>เวอร์ชัน 10 กันยายน 2026</p>
    </section>
  );
}
