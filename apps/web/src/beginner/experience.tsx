import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
  Badge,
  Button,
  Card,
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
  TooltipProvider,
} from "@polylove/ui";
import { Buddy, Icon, StoryWorld } from "./illustrations";
import {
  FriendNote,
  Glossary,
  Lesson,
  ProbabilityBar,
  Simulator,
  TinyHelp,
  Uncertainty,
} from "./learning";
import {
  dateLabel,
  dollars,
  number,
  probability,
  rankStories,
  words as w,
  type Market,
  type DataState,
} from "./market-model";
import type { Locale } from "../terminal";
import "./beginner.css";

gsap.registerPlugin(ScrollTrigger);
export type Destination = {
  view: "landing" | "terminal";
  section: string;
  market?: string;
};
interface Props {
  locale: Locale;
  setLocale: (value: Locale) => void;
  items: Market[];
  state: DataState;
  asOf?: string;
  retry: () => void;
  view: "landing" | "terminal";
  routeKey: string;
  marketId?: string;
  navigate: (destination: Destination) => void;
}

function Nav({
  locale,
  setLocale,
  view,
  navigate,
}: {
  locale: Locale;
  setLocale: Props["setLocale"];
  view: Props["view"];
  navigate: Props["navigate"];
}) {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 24);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-18% 0px -55% 0px" },
    );
    document
      .querySelectorAll("main section[id]")
      .forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
    };
  }, [view]);
  const entries = [
    ["learn", "เริ่มทำความเข้าใจ", "Start learning"],
    ["stories", "สำรวจเรื่องราว", "Explore stories"],
    ["practice", "ลองด้วยเงินจำลอง", "Try imaginary funds"],
  ] as const;
  const visit = (section: string) => {
    setMenu(false);
    navigate({ view: section === "learn" ? "landing" : view, section });
  };
  const links = (
    <>
      {entries.map(([id, th, en]) => (
        <button
          key={id}
          aria-current={active === id ? "location" : undefined}
          onClick={() => visit(id)}
        >
          {w(locale, th, en)}
        </button>
      ))}
      <Glossary locale={locale} />
    </>
  );
  return (
    <header className={`learn-nav ${scrolled ? "scrolled" : ""}`}>
      <a className="skip-link" href="#main-content">
        {w(locale, "ข้ามไปเนื้อหา", "Skip to content")}
      </a>
      <div className="nav-inner">
        <a
          className="learn-brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate({ view: "landing", section: "welcome" });
          }}
        >
          <Buddy />
          <span>
            polylove<span className="brand-dot">.</span>
          </span>
        </a>
        <nav
          className="desktop-nav"
          aria-label={w(locale, "เมนูหลัก", "Main navigation")}
        >
          {links}
        </nav>
        <div className="nav-tools">
          <Button
            className="locale-button"
            variant="outline"
            onClick={() => setLocale(locale === "th" ? "en" : "th")}
            aria-label={w(locale, "Switch to English", "เปลี่ยนเป็นภาษาไทย")}
          >
            <Icon name="globe" />
            {locale.toUpperCase()}
          </Button>
          <Sheet open={menu} onOpenChange={setMenu}>
            <SheetTrigger asChild>
              <Button
                className="mobile-menu-button"
                variant="outline"
                aria-label={w(locale, "เปิดเมนู", "Open menu")}
              >
                <Icon name="menu" />
              </Button>
            </SheetTrigger>
            <SheetPortal>
              <SheetOverlay className="learn-overlay" />
              <SheetContent className="learn-sheet">
                <SheetTitle>polylove</SheetTitle>
                <SheetDescription>
                  {w(
                    locale,
                    "เลือกจุดที่อยากสำรวจต่อ",
                    "Choose where you would like to go next.",
                  )}
                </SheetDescription>
                <SheetClose
                  className="dialog-x"
                  aria-label={w(locale, "ปิดเมนู", "Close menu")}
                >
                  <Icon name="close" />
                </SheetClose>
                <nav
                  className="sheet-nav"
                  aria-label={w(locale, "เมนูมือถือ", "Mobile navigation")}
                >
                  {links}
                </nav>
              </SheetContent>
            </SheetPortal>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function DataMessage({
  state,
  asOf,
  locale,
  retry,
}: {
  state: DataState;
  asOf?: string;
  locale: Locale;
  retry: () => void;
}) {
  const messages = {
    loading: [
      "กำลังเปิดเรื่องราวจากตลาดให้ รอสักครู่นะ",
      "Opening real market stories. One moment…",
    ],
    error: [
      "ตอนนี้เชื่อมต่อตลาดไม่ได้ ลองใหม่ได้เลย บทเรียนด้านบนยังอ่านได้",
      "We cannot reach the market right now. Try again; the learning example is still available.",
    ],
    stale: [
      "นี่คือข้อมูลที่เก็บไว้ ราคาปัจจุบันอาจเปลี่ยนแล้ว โหลดใหม่ก่อนลองจำลองนะ",
      "These are saved prices and may have changed. Refresh before trying the preview.",
    ],
    empty: [
      "ยังไม่มีเรื่องราวจากตลาดในตอนนี้ ลองโหลดอีกครั้งได้",
      "There are no market stories available yet. Try refreshing.",
    ],
    fresh: ["ข้อมูลตลาดจริงจาก Polymarket", "Real market data from Polymarket"],
  } as const;
  return (
    <div className={`data-message ${state}`} role="status">
      <span className="state-dot" />
      <div>
        <p>{w(locale, messages[state][0], messages[state][1])}</p>
        {asOf && (
          <small>
            {w(locale, "อัปเดต", "Updated")} {dateLabel(asOf, locale)} ·{" "}
            {w(locale, "เวลาท้องถิ่นของคุณ", "your local time")}
          </small>
        )}
      </div>
      {state !== "loading" && state !== "fresh" && (
        <Button variant="outline" onClick={retry}>
          {w(locale, "ลองโหลดใหม่", "Try again")}
        </Button>
      )}
    </div>
  );
}

function StoryCard({
  market,
  locale,
  asOf,
  onSelect,
  index,
}: {
  market: Market;
  locale: Locale;
  asOf?: string;
  onSelect: () => void;
  index: number;
}) {
  return (
    <Card className="story-card">
      <div className={`story-card-art tone-${index % 3}`} aria-hidden="true">
        <Icon name={(["book", "clock", "search"] as const)[index % 3]} />
        <span className="art-dash" />
        <span className="art-circle" />
      </div>
      <div className="story-card-body">
        <Badge>
          {w(locale, "ตลาดจริง · ต้นฉบับ", "Live market · source")}{" "}
          {market.source_language.toUpperCase()}
        </Badge>
        <h3 lang={market.source_language}>{market.question}</h3>
        <ProbabilityBar value={market.yes_probability} locale={locale} />
        <small className="story-time">
          <Icon name="clock" />
          {dateLabel(asOf, locale)}
        </small>
        <Button variant="outline" onClick={onSelect}>
          {w(locale, "ช่วยอธิบายเรื่องนี้", "Help me read this story")}
          <Icon name="arrow" />
        </Button>
      </div>
    </Card>
  );
}

function MarketDetail({
  market,
  locale,
  asOf,
  navigate,
}: {
  market: Market;
  locale: Locale;
  asOf?: string;
  navigate: Props["navigate"];
}) {
  return (
    <section className="market-detail page-section" id="detail" tabIndex={-1}>
      <div className="detail-heading">
        <Badge>
          {w(
            locale,
            "กำลังสำรวจตลาดจริง · ภาษาเดิม",
            "Reading a real market · original language",
          )}{" "}
          {market.source_language.toUpperCase()}
        </Badge>
        <h2 lang={market.source_language}>{market.question}</h2>
        <p>
          {w(
            locale,
            "ลองอ่านทีละส่วน โดยยังไม่ต้องเลือกลงทุน",
            "Let’s read this one piece at a time, without choosing an investment.",
          )}
        </p>
      </div>
      <div className="detail-path">
        <article>
          <span className="path-number">1</span>
          <h3>{w(locale, "คำถามนี้คืออะไร?", "What is the question?")}</h3>
          <p>
            {w(
              locale,
              "YES หมายถึงเหตุการณ์นี้เกิดขึ้น ส่วน NO หมายถึงไม่เกิดขึ้น เราเก็บคำถามต้นฉบับไว้เพื่อไม่ให้ความหมายเปลี่ยน",
              "YES means this event happens; NO means it does not. We keep the original question to preserve its meaning.",
            )}
          </p>
          <Glossary
            locale={locale}
            term="yes"
            label={w(locale, "รู้จัก YES / NO", "Understand YES / NO")}
          />
        </article>
        <article>
          <span className="path-number">2</span>
          <h3>
            {w(locale, "ตลาดกำลังคิดอย่างไร?", "What does the price suggest?")}
          </h3>
          <ProbabilityBar value={market.yes_probability} locale={locale} />
          <p>
            {w(
              locale,
              "ความน่าจะเป็นนี้คำนวณจากราคา YES ของตลาด ไม่ใช่โมเดลพยากรณ์ของ Polylove",
              "This probability comes from the market’s YES price, not a Polylove forecasting model.",
            )}
          </p>
          <Glossary
            locale={locale}
            term="probability"
            label={w(locale, "ช่วยอธิบายตัวเลขนี้", "Explain this number")}
          />
        </article>
        <article>
          <span className="path-number">3</span>
          <h3>
            {w(locale, "มีการซื้อขายแค่ไหน?", "How much trading is happening?")}
          </h3>
          <dl className="readable-metrics">
            <div>
              <dt>
                {w(locale, "ซื้อขายใน 24 ชั่วโมง", "Traded in 24 hours")}
                <TinyHelp label="Volume">
                  {w(
                    locale,
                    "มูลค่าซื้อขาย ไม่ใช่จำนวนผู้ซื้อ",
                    "Amount traded, not the number of buyers.",
                  )}
                </TinyHelp>
              </dt>
              <dd>{dollars(market.volume_24h, locale)}</dd>
            </div>
            <div>
              <dt>
                {w(locale, "เงินรองรับการซื้อขาย", "Trading liquidity")}
                <TinyHelp label="Liquidity">
                  {w(
                    locale,
                    "ไม่ได้รับรองว่าจะขายได้ทันที",
                    "Does not guarantee an instant sale.",
                  )}
                </TinyHelp>
              </dt>
              <dd>{dollars(market.liquidity, locale)}</dd>
            </div>
            <div>
              <dt>
                {w(
                  locale,
                  "ช่องว่างราคาซื้อกับขาย",
                  "Gap between buy and sell prices",
                )}
              </dt>
              <dd>
                {market.spread === null || !Number.isFinite(market.spread)
                  ? w(locale, "ยังไม่มีข้อมูล", "Not available")
                  : `${number(market.spread * 100, locale)} ${w(locale, "จุดเปอร์เซ็นต์", "percentage points")}`}
              </dd>
            </div>
          </dl>
          <Glossary
            locale={locale}
            term="spread"
            label={w(
              locale,
              "รู้จักสภาพคล่องและช่องว่างราคา",
              "Understand liquidity and spread",
            )}
          />
        </article>
        <article>
          <span className="path-number">4</span>
          <h3>{w(locale, "ต้องตรวจอะไรต่อ?", "What should I check next?")}</h3>
          <p>
            {w(locale, "วันปิดที่ต้นทางระบุ", "Listed closing date")}:{" "}
            <strong>{dateLabel(market.end_date, locale)}</strong>
          </p>
          <p>
            {w(
              locale,
              "ยังไม่มีเงื่อนไขตัดสินผลในข้อมูลชุดนี้ ต้องอ่านจากต้นทางก่อนตีความคำถามหรือผลลัพธ์",
              "Resolution rules are not included in this data. Read them at the source before interpreting the question or result.",
            )}
          </p>
          {market.slug && (
            <a
              className="text-link"
              href={`https://polymarket.com/market/${encodeURIComponent(market.slug)}`}
              target="_blank"
              rel="noreferrer"
            >
              {w(
                locale,
                "อ่านเงื่อนไขที่ Polymarket (เปิดแท็บใหม่)",
                "Read rules on Polymarket (new tab)",
              )}
              <Icon name="arrow" />
            </a>
          )}
          <small className="detail-source">
            {w(
              locale,
              "ที่มา: Polymarket · อัปเดต",
              "Source: Polymarket · Updated",
            )}{" "}
            {dateLabel(asOf, locale)}
          </small>
        </article>
      </div>
      <div className="detail-next">
        <FriendNote>
          {w(
            locale,
            "อ่านครบแล้ว ลองดูผลของคำตอบด้วยเงินสมมติได้ โดยไม่เปิดสถานะจริง",
            "Now try exploring both outcomes with imaginary funds, without opening a position.",
          )}
        </FriendNote>
        <Button
          onClick={() =>
            navigate({
              view: "terminal",
              section: "practice",
              market: market.id,
            })
          }
        >
          {w(
            locale,
            "ลองจำลองเรื่องนี้",
            "Try this story with imaginary funds",
          )}
          <Icon name="arrow" />
        </Button>
      </div>
    </section>
  );
}

export function BeginnerExperience(props: Props) {
  const {
    locale,
    setLocale,
    items,
    state,
    asOf,
    retry,
    view,
    navigate,
    routeKey,
    marketId,
  } = props;
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("activity");
  const ranked = useMemo(() => rankStories(items), [items]);
  const filtered = useMemo(
    () =>
      ranked
        .filter((m) => m.question.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (sort === "liquidity" ? b.liquidity - a.liquidity : 0)),
    [ranked, search, sort],
  );
  const selected = ranked.find((m) => m.id === marketId);
  const limit = Math.max(0, Math.ceil(filtered.length / 3) - 1);
  const currentPage = Math.min(page, limit);
  const visible = filtered.slice(currentPage * 3, currentPage * 3 + 3);
  useEffect(() => {
    setPage(0);
  }, [search, sort]);
  useEffect(() => {
    const id =
      decodeURIComponent(window.location.hash.slice(1)) ||
      (view === "landing" ? "welcome" : "stories");
    const aliases: Record<string, string> = {
      markets: "stories",
      overview: "stories",
      signals: "practice",
      risk: "practice",
    };
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(aliases[id] ?? id);
      el?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
      if (window.location.hash) el?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [routeKey, view, reduced, selected?.id]);
  useLayoutEffect(() => {
    if (reduced || !root.current || view !== 'landing') return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".welcome-copy > *",
        { y: 18 },
        { y: 0, duration: 0.7, stagger: 0.07, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-buddy",
        { rotation: -7, y: 18 },
        { rotation: 0, y: 0, duration: 1, ease: "power3.out" },
      );
      gsap.fromTo(
        ".lesson-card",
        { y: 26 },
        {
          y: 0,
          duration: 0.7,
          scrollTrigger: {
            trigger: ".lesson-card",
            start: "top 88%",
            once: true,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, [view, reduced]);
  const choose = (market: Market) =>
    navigate({ view: "terminal", section: "detail", market: market.id });
  return (
    <TooltipProvider delayDuration={200}>
      <div className="beginner-app" ref={root}>
        <Nav
          locale={locale}
          setLocale={setLocale}
          view={view}
          navigate={navigate}
        />
        <main id="main-content" tabIndex={-1}>
          {view === "landing" ? (
            <>
              <section className="welcome" id="welcome" tabIndex={-1}>
                <StoryWorld />
                <div className="welcome-inner">
                  <div className="welcome-copy">
                    <div className="welcome-hello">
                      <span className="little-dot" />
                      {w(
                        locale,
                        "พื้นที่เล็กๆ สำหรับความสงสัยของคุณ",
                        "A little space for your curiosity",
                      )}
                    </div>
                    <h1>
                      {w(
                        locale,
                        "ไม่เคยเทรด\nก็เริ่มเข้าใจ\nตลาดได้",
                        "New to trading?\nStart with\nunderstanding.",
                      )}
                    </h1>
                    <p>
                      {w(
                        locale,
                        "ค่อยๆ อ่านเรื่องราว เข้าใจตัวเลข แล้วลองด้วยเงินจำลอง มีโพลี่เป็นเพื่อนพาไปทีละก้าว",
                        "Read the story. Make sense of the numbers. Try imaginary funds. Poly is here to take it one step at a time.",
                      )}
                    </p>
                    <Button
                      onClick={() =>
                        navigate({ view: "landing", section: "learn" })
                      }
                    >
                      {w(locale, "พาฉันลองดู", "Show me how")}
                      <Icon name="arrow" />
                    </Button>
                    <span className="welcome-footnote">
                      <Icon name="check" />
                      {w(
                        locale,
                        "เริ่มได้โดยไม่ใช้เงินจริง",
                        "No real money needed to begin",
                      )}
                    </span>
                  </div>
                  <div className="hero-friend">
                    <div className="speech-note">
                      {w(
                        locale,
                        "ไม่ต้องรู้ทุกอย่าง\nแค่เริ่มจากหนึ่งคำถาม",
                        "You don’t need all the answers.\nJust a little curiosity.",
                      )}
                      <span />
                    </div>
                    <Buddy className="hero-buddy" />
                  </div>
                </div>
                <div className="welcome-bottom">
                  <span>
                    polylove /{" "}
                    {w(
                      locale,
                      "ค่อยๆ รู้ ค่อยๆ เข้าใจ",
                      "a gentler way to understand",
                    )}
                  </span>
                  <a href="#learn">
                    {w(locale, "เริ่มเรื่องแรก", "Begin your first story")}
                    <Icon name="chevron" />
                  </a>
                </div>
              </section>
              <Lesson locale={locale} />
            </>
          ) : (
            <section
              className="desk-heading page-section"
              id="desk"
              tabIndex={-1}
            >
              <div>
                <Button
                  className="text-button"
                  variant="outline"
                  onClick={() =>
                    navigate({ view: "landing", section: "learn" })
                  }
                >
                  <Icon name="book" />
                  {w(locale, "กลับไปบทเรียนสั้นๆ", "Back to the little lesson")}
                </Button>
                <h1>{w(locale, "โต๊ะสำรวจของฉัน", "My discovery desk")}</h1>
                <p>
                  {w(
                    locale,
                    "เลือกหนึ่งเรื่องที่สงสัย แล้วเรามาอ่านด้วยกัน",
                    "Choose one story you’re curious about. Let’s read it together.",
                  )}
                </p>
              </div>
              <Buddy />
            </section>
          )}
          <section
            className="stories-section page-section"
            id="stories"
            tabIndex={-1}
          >
            <div className="section-heading">
              <div>
                {view === "landing" && (
                  <span className="chapter-index">
                    02 / {w(locale, "ลองมองโลกจริง", "Meet the real world")}
                  </span>
                )}
                <h2>
                  {w(
                    locale,
                    "วันนี้ คุณสงสัยเรื่องอะไร?",
                    "What are you curious about today?",
                  )}
                </h2>
                <p>
                  {w(
                    locale,
                    "เรื่องที่มีกิจกรรมในตลาด สำหรับเริ่มสำรวจ ไม่ใช่รายการแนะนำให้ซื้อ",
                    "Active market stories to explore, not a list of things to buy.",
                  )}
                </p>
              </div>
              {view === "landing" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate({ view: "terminal", section: "stories" })
                  }
                >
                  {w(locale, "ไปที่โต๊ะสำรวจ", "Open my discovery desk")}
                  <Icon name="arrow" />
                </Button>
              )}
            </div>
            <DataMessage
              state={state}
              asOf={asOf}
              locale={locale}
              retry={retry}
            />
            {view === "terminal" && (
              <div className="story-controls">
                <label className="story-search">
                  <Icon name="search" />
                  <input
                    aria-label={w(
                      locale,
                      "ค้นหาเรื่องที่สนใจ",
                      "Search stories",
                    )}
                    placeholder={w(
                      locale,
                      "ค้นหาคำในคำถามต้นฉบับ…",
                      "Search the original market questions…",
                    )}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label className="story-sort">
                  {w(locale, "เรียงตาม", "Sort by")}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="activity">
                      {w(
                        locale,
                        "กิจกรรมและข้อมูลที่ครบ",
                        "Activity and completeness",
                      )}
                    </option>
                    <option value="liquidity">
                      {w(locale, "เงินรองรับการซื้อขาย", "Trading liquidity")}
                    </option>
                  </select>
                </label>
              </div>
            )}
            {state === "loading" ? (
              <div className="story-grid skeleton-grid" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <span />
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${currentPage}-${search}-${sort}`}
                  className="story-grid"
                  initial={{ opacity: reduced ? 1 : 0.7 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: reduced ? 1 : 0.7 }}
                  transition={{ duration: reduced ? 0 : 0.15 }}
                >
                  {visible.map((market, index) => (
                    <StoryCard
                      key={market.id}
                      market={market}
                      locale={locale}
                      asOf={asOf}
                      index={index}
                      onSelect={() => choose(market)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
            {state !== "loading" &&
              state !== "error" &&
              !filtered.length &&
              ranked.length > 0 && (
                <div className="data-message">
                  <p>
                    {w(
                      locale,
                      "ยังไม่พบเรื่องนี้ ลองใช้คำอื่นหรือดูเรื่องทั้งหมด",
                      "No matching story. Try another word or view all stories.",
                    )}
                  </p>
                  <Button variant="outline" onClick={() => setSearch("")}>
                    {w(locale, "ดูเรื่องทั้งหมด", "Show all stories")}
                  </Button>
                </div>
              )}
            {filtered.length > 3 && (
              <div className="story-pagination">
                <span>
                  {w(
                    locale,
                    `เรื่อง ${currentPage * 3 + 1}–${Math.min(currentPage * 3 + 3, filtered.length)} จาก ${filtered.length}`,
                    `Stories ${currentPage * 3 + 1}–${Math.min(currentPage * 3 + 3, filtered.length)} of ${filtered.length}`,
                  )}
                </span>
                <div>
                  <Button
                    variant="outline"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    {w(locale, "ก่อนหน้า", "Previous")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={currentPage >= limit}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    {w(locale, "เรื่องถัดไป", "Next stories")}
                    <Icon name="arrow" />
                  </Button>
                </div>
              </div>
            )}
            {view === "terminal" && (
              <Accordion
                type="single"
                collapsible
                className="learn-accordion advanced-data"
              >
                <AccordionItem value="data">
                  <AccordionHeader>
                    <AccordionTrigger>
                      {w(
                        locale,
                        "ดูข้อมูลเพิ่มเติมแบบตาราง",
                        "See more data in a table",
                      )}
                      <Icon name="chevron" />
                    </AccordionTrigger>
                  </AccordionHeader>
                  <AccordionContent>
                    <div
                      className="table-scroll"
                      role="region"
                      aria-label={w(
                        locale,
                        "ตารางตลาด เลื่อนแนวนอนได้",
                        "Scrollable market data table",
                      )}
                      tabIndex={0}
                    >
                      <table>
                        <caption>
                          {w(
                            locale,
                            "ข้อมูลราคาและกิจกรรมจาก Polymarket ไม่ใช่สัญญาณซื้อขาย",
                            "Prices and activity from Polymarket, not trading signals",
                          )}
                        </caption>
                        <thead>
                          <tr>
                            <th>{w(locale, "เรื่องราว", "Story")}</th>
                            <th>
                              {w(
                                locale,
                                "โอกาสจากราคา YES",
                                "YES price probability",
                              )}
                            </th>
                            <th>
                              {w(locale, "ซื้อขาย 24 ชั่วโมง", "24h traded")}
                            </th>
                            <th>{w(locale, "สภาพคล่อง", "Liquidity")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((m) => (
                            <tr key={m.id}>
                              <td>
                                <button
                                  onClick={() => choose(m)}
                                  lang={m.source_language}
                                >
                                  {m.question}
                                </button>
                              </td>
                              <td>{probability(m.yes_probability, locale)}</td>
                              <td>{dollars(m.volume_24h, locale)}</td>
                              <td>{dollars(m.liquidity, locale)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </section>
          {view === "terminal" && selected && (
            <MarketDetail
              market={selected}
              locale={locale}
              asOf={asOf}
              navigate={navigate}
            />
          )}
          {view === "terminal" &&
            marketId &&
            !selected &&
            state !== "loading" && (
              <div className="page-section data-message">
                <p>
                  {w(
                    locale,
                    "เรื่องที่เลือกไม่อยู่ในข้อมูลชุดนี้แล้ว เลือกเรื่องใหม่ด้านบนได้เลย",
                    "That story is no longer in this data set. Choose another story above.",
                  )}
                </p>
              </div>
            )}
          <Uncertainty locale={locale} />
          <Simulator
            key={selected?.id ?? "unselected"}
            locale={locale}
            market={selected}
            state={state}
            retry={retry}
          />
          <section className="learning-close page-section">
            <Buddy />
            <h2>
              {w(
                locale,
                "ไม่ต้องรีบเก่ง\nแค่เข้าใจเพิ่มอีกนิด",
                "No need to rush.\nA little understanding goes a long way.",
              )}
            </h2>
            <p>
              {w(
                locale,
                "กลับมาอ่าน ทบทวน หรือลองเรื่องใหม่ได้เสมอ",
                "Come back to read, revisit or explore another story whenever you like.",
              )}
            </p>
            <Button
              onClick={() => navigate({ view: "terminal", section: "stories" })}
            >
              {w(locale, "เลือกเรื่องต่อไป", "Explore another story")}
              <Icon name="arrow" />
            </Button>
          </section>
        </main>
        <footer className="learn-footer">
          <a
            className="learn-brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate({ view: "landing", section: "welcome" });
            }}
          >
            polylove<span className="brand-dot">.</span>
          </a>
          <p>
            {w(
              locale,
              "พื้นที่เรียนรู้ตลาดและทดลองเงินจำลอง ข้อมูลช่วยให้เข้าใจ ไม่ได้รับรองผลลัพธ์",
              "A place to understand markets and explore imaginary funds. Information supports learning; it does not guarantee outcomes.",
            )}
          </p>
          <Glossary locale={locale} />
        </footer>
      </div>
    </TooltipProvider>
  );
}
