import { useState } from "react";
import { Buddy, Icon, StoryWorld } from "../beginner/illustrations";
import { MarketCards, NewsItems, AnalysisItems } from "./content";
import { useData } from "./api";
import { Message } from "./shared";

export function PolyNote({ children }: { children: React.ReactNode }) {
  return (
    <aside className="poly-note">
      <Buddy />
      <div>
        <strong>โพลี่ชวนสังเกต</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}
const chapters = [
  {
    title: "ข่าวกำลังเล่าอะไร?",
    icon: "book" as const,
    heading: "เริ่มจากเรื่องที่เกิดขึ้น",
    text: "อ่านว่าใครทำอะไร เกิดขึ้นเมื่อไร แล้วเปิดแหล่งต้นทางดูอีกครั้ง ข่าวหนึ่งเรื่องอาจมีผลต่อเหรียญแต่ละตัวไม่เหมือนกัน",
    note: "เห็นหัวข่าวแล้ว ยังไม่ต้องรีบตัดสินใจ เรามาดูที่มาด้วยกันก่อนนะ",
  },
  {
    title: "ตัวเลขบอกอะไรเพิ่ม?",
    icon: "search" as const,
    heading: "ดูราคา คู่กับปริมาณซื้อขาย",
    text: "Volume คือปริมาณที่ซื้อขายในช่วงหนึ่ง ช่วยให้เห็นกิจกรรมในตลาด ส่วนกราฟช่วยดูว่าราคาเปลี่ยนอย่างไร ต้องอ่านทั้งสองอย่างประกอบกัน",
    note: "ราคาขึ้นอย่างเดียว ยังบอกไม่ได้ว่าจะขึ้นต่อ ลองดูว่าข้อมูลครบหรือยังนะ",
  },
  {
    title: "แล้วควรจับตาอะไร?",
    icon: "clock" as const,
    heading: "อ่านเงื่อนไข ก่อนอ่านจุดเข้า",
    text: "แผนแต่ละชิ้นบอกสิ่งที่ต้องรอ จุดที่ทำให้แผนเปลี่ยน และเวลาหมดอายุ ถ้าเงื่อนไขยังไม่ครบ การรอดูสถานการณ์ก็เป็นคำตอบได้",
    note: "ฉันช่วยพาอ่านข้อมูล ส่วนการตัดสินใจเป็นของคุณ ค่อย ๆ ดูทีละเรื่องได้เลย",
  },
];
export function StoryLanding() {
  const [chapter, setChapter] = useState(0),
    news = useData("/news"),
    analyses = useData("/analyses");
  const item = chapters[chapter];
  return (
    <>
      <section className="poly-hero container">
        <div className="poly-hero-copy">
          <span className="hello-label">มีเพื่อนช่วยอ่านตลาดแล้วนะ</span>
          <h1>
            ตลาดมีเรื่องให้รู้ทุกวัน
            <br />
            ค่อย ๆ เข้าใจไปด้วยกัน
          </h1>
          <p className="lead">
            ให้โพลี่ช่วยเรียงเรื่องข่าว ราคา และมุมมอง Crypto
            <br className="desktop-break" />
            เป็นเรื่องอ่านง่าย ก่อนคุณตัดสินใจด้วยตัวเอง
          </p>
          <div className="actions">
            <a className="pill-link large" href="#learn">
              ให้โพลี่พาเริ่มต้น <Icon name="arrow" />
            </a>
            <a href="/register">สร้างพื้นที่ของฉัน</a>
          </div>
          <div className="hero-promise">
            <Icon name="check" />
            <span>อ่านภาษาไทย · มีแหล่งที่มา · เริ่มใช้ฟรี</span>
          </div>
        </div>
        <div className="poly-world">
          <StoryWorld />
          <div className="speech">
            <strong>สวัสดี ฉันชื่อโพลี่!</strong>
            <span>วันนี้อยากรู้จักตลาดเรื่องไหนดี?</span>
          </div>
          <Buddy className="hero-buddy" />
          <span className="world-caption">
            เพื่อนตัวเล็ก สำหรับเรื่องตลาดที่ดูใหญ่
          </span>
        </div>
      </section>
      <nav className="story-map container" aria-label="เส้นทางอ่านตลาด">
        <a href="#learn">
          <Icon name="book" />
          ค่อย ๆ รู้จักตลาด
        </a>
        <span aria-hidden="true">······</span>
        <a href="#markets">
          <Icon name="search" />
          สำรวจเหรียญวันนี้
        </a>
        <span aria-hidden="true">······</span>
        <a href="#stories">
          <Icon name="spark" />
          อ่านเรื่องที่น่าสนใจ
        </a>
      </nav>
      <section id="learn" className="container section story-lesson">
        <div>
          <span className="chapter-label">เริ่มจากเรื่องเล็ก ๆ</span>
          <h2>
            เห็นข่าวว่าเหรียญกำลังขึ้น
            <br />
            เราควรดูอะไรต่อดี?
          </h2>
          <p>
            ไม่ต้องจำคำศัพท์ทั้งหมด เลือกคำถามที่คุณสงสัย
            <br />
            แล้วโพลี่จะช่วยอธิบายทีละนิด
          </p>
          <PolyNote>{item.note}</PolyNote>
        </div>
        <div className="lesson-book">
          <div
            className="lesson-tabs"
            role="tablist"
            aria-label="เรียนรู้การอ่านตลาด"
          >
            {chapters.map((c, i) => (
              <button
                key={c.title}
                id={"chapter-" + i}
                type="button"
                role="tab"
                aria-selected={chapter === i}
                aria-controls="chapter-panel"
                onClick={() => setChapter(i)}
                onKeyDown={(e) => {
                  if (
                    ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    setChapter(next);
                    document.getElementById("chapter-" + next)?.focus();
                  }
                }}
                tabIndex={chapter === i ? 0 : -1}
              >
                <Icon name={c.icon} />
                {c.title}
              </button>
            ))}
          </div>
          <div
            id="chapter-panel"
            role="tabpanel"
            aria-labelledby={"chapter-" + chapter}
            tabIndex={0}
          >
            <div className={"lesson-object object-" + chapter}>
              <Icon name={item.icon} />
              <span aria-hidden="true">✦</span>
            </div>
            <h3>{item.heading}</h3>
            <p>{item.text}</p>
            <small>คำอธิบายเพื่อเรียนรู้ ไม่ใช่สัญญาณซื้อขาย</small>
          </div>
          <div className="lesson-bottom">
            <span>{chapter + 1} จาก 3 เรื่อง</span>
            {chapter < 2 ? (
              <button onClick={() => setChapter(chapter + 1)}>
                ไปเรื่องถัดไป <Icon name="arrow" />
              </button>
            ) : (
              <a href="#markets">
                พร้อมแล้ว ไปสำรวจตลาด <Icon name="arrow" />
              </a>
            )}
          </div>
        </div>
      </section>
      <section id="markets" className="container section">
        <div className="section-title">
          <div>
            <span className="chapter-label">จากเรื่องเล่า มาดูข้อมูลจริง</span>
            <h2>วันนี้เพื่อน ๆ ในตลาดเป็นอย่างไร?</h2>
            <p>เริ่มรู้จักสามเหรียญนี้ เลือกตัวที่อยากอ่านต่อได้เลย</p>
          </div>
          <span className="source-note">
            <Icon name="clock" />
            ราคา Binance · ทุก 30 วินาที
          </span>
        </div>
        <MarketCards />
        <p className="gentle-caption">
          ราคาเป็นหน่วย USDT ดูเวลาข้อมูลบนการ์ดก่อนเสมอนะ
        </p>
      </section>
      <section id="stories" className="story-wash">
        <div className="container section">
          <div className="section-title">
            <div>
              <span className="chapter-label">เปิดสมุดข่าวของวันนี้</span>
              <h2>เรื่องไหนกำลังทำให้ตลาดขยับ?</h2>
              <p>อ่านสรุปสั้น ๆ แล้วค่อยเปิดรายละเอียดเมื่ออยากรู้เพิ่ม</p>
            </div>
            <a href="/app/news">
              เปิดสมุดข่าวทั้งหมด <Icon name="book" />
            </a>
          </div>
          <NewsItems items={news.data?.items?.slice(0, 3) ?? []} />
          {news.error && (
            <Message error>
              โพลี่ยังโหลดข่าวไม่ได้ ลองกลับมาดูอีกครั้งนะ
            </Message>
          )}
          <h3>มุมมองที่ผ่านการตรวจแล้ว</h3>
          <AnalysisItems items={analyses.data?.items?.slice(0, 3) ?? []} />
        </div>
      </section>
      <section className="container section poly-invite">
        <Buddy />
        <div>
          <h2>
            เก็บเรื่องที่สนใจ
            <br />
            ไว้ในมุมเล็ก ๆ ของคุณ
          </h2>
          <p>
            เลือกเหรียญที่อยากติดตาม ตั้งราคาแจ้งเตือน
            <br />
            แล้วให้โพลี่ส่งเรื่องใหม่ไปที่ Telegram
          </p>
          <a className="pill-link large" href="/register">
            เริ่มสร้างพื้นที่ของฉัน
          </a>
          <small>สมัครด้วยอีเมลหรือ Google · ไม่มีค่าใช้จ่ายช่วงทดลอง</small>
        </div>
        <div className="tiny-steps">
          <p>
            <span>1</span>สร้างบัญชีของคุณ
          </p>
          <p>
            <span>2</span>เลือกเหรียญที่สนใจ
          </p>
          <p>
            <span>3</span>เชื่อม Telegram เมื่อพร้อม
          </p>
        </div>
      </section>
      <section className="container section faq">
        <h2>ยังสงสัยอยู่ไหม? โพลี่ช่วยอธิบาย</h2>
        {[
          [
            "โพลี่ซื้อขายให้ด้วยไหม?",
            "โพลี่ช่วยอ่านข่าวและข้อมูล ส่วนการตัดสินใจและซื้อขายเป็นของคุณเอง",
          ],
          [
            "บทวิเคราะห์มาจากไหน?",
            "AI ช่วยร่างจากข้อมูลราคา แท่งเทียน และข่าวที่มีแหล่งอ้างอิง จากนั้นผู้ดูแลตรวจอนุมัติก่อนเผยแพร่",
          ],
          [
            "เพิ่งเริ่มต้นก็ใช้ได้ไหม?",
            "เริ่มจากบทเรียนสั้น ๆ และติดตามเหรียญเดียวก่อนได้ ไม่จำเป็นต้องเข้าใจทุกตัวเลขตั้งแต่วันแรก",
          ],
          [
            "ถ้าไม่มีข้อมูลหรือยังไม่มีแผนล่ะ?",
            "เราจะแสดงตามจริงว่าอยู่ระหว่างรอข้อมูลหรือรอตรวจ และไม่สร้างราคาแทนข้อมูลที่ขาด",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </>
  );
}
