import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
  Badge,
  Button,
  Card,
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from "@polylove/ui";
import type { Locale } from "../terminal";
import { Buddy, Icon } from "./illustrations";
import {
  words as w,
  number,
  probability,
  simulate,
  type Market,
  type DataState,
} from "./market-model";

export function FriendNote({ children }: { children: ReactNode }) {
  return (
    <div className="friend-note">
      <Buddy />
      <p>{children}</p>
    </div>
  );
}
const glossary = [
  [
    "yes",
    "YES / NO",
    "YES คือเลือกว่าจะเกิดขึ้น NO คือเลือกว่าจะไม่เกิดขึ้น ผลจริงขึ้นกับเงื่อนไขตัดสินของตลาด",
    "YES means the event happens; NO means it does not. The market’s resolution rules decide the outcome.",
  ],
  [
    "probability",
    "Probability",
    "โอกาสที่สะท้อนจากราคา เช่น ราคา YES 0.60 แสดงเป็นประมาณ 60% ไม่ใช่ผลสำรวจหรือการรับรองว่าจะเกิดขึ้น",
    "A probability implied by price: a YES price of 0.60 is shown as about 60%. It is neither a poll nor a guarantee.",
  ],
  [
    "volume",
    "Volume",
    "มูลค่าที่มีการซื้อขายในช่วงเวลาหนึ่ง ไม่ใช่จำนวนคน และซื้อขายมากไม่ได้แปลว่าผลจะถูกต้อง",
    "The amount traded in a period, not the number of people. More trading does not make an outcome more certain.",
  ],
  [
    "liquidity",
    "Liquidity",
    "ข้อมูลสภาพคล่องช่วยดูว่ามีเงินรองรับการซื้อขายเท่าไร แต่ไม่ได้รับรองว่าจะซื้อหรือขายได้ทันทีในราคาที่เห็น",
    "Liquidity helps describe funds available to trade. It does not guarantee an immediate fill at the displayed price.",
  ],
  [
    "spread",
    "Spread",
    "ช่องว่างระหว่างราคาที่คนอยากซื้อกับราคาที่คนอยากขาย ยิ่งห่าง ต้นทุนการเข้าและออกอาจยิ่งมาก",
    "The gap between buy and sell prices. A wider gap can make entering and exiting more costly.",
  ],
  [
    "paper",
    "Paper trading",
    "การลองคำนวณด้วยเงินสมมติ หน้านี้ไม่ส่งคำสั่ง ไม่เปิดสถานะ และไม่สร้างพอร์ต",
    "Practising with imaginary funds. This page sends no order, opens no position and creates no portfolio.",
  ],
] as const;
export function Glossary({
  locale,
  term,
  label,
}: {
  locale: Locale;
  term?: string;
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="help-button">
          <Icon name="book" />
          {label ?? w(locale, "คำศัพท์ใกล้ตัว", "Friendly glossary")}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="learn-overlay" />
        <DialogContent className="learn-dialog">
          <DialogTitle>
            {w(locale, "ค่อยๆ รู้จักคำเหล่านี้", "A few words, made simple")}
          </DialogTitle>
          <DialogDescription>
            {w(
              locale,
              "อ่านเท่าที่สงสัย แล้วกลับไปที่เรื่องเดิมได้เลย",
              "Read what you need, then return to your story.",
            )}
          </DialogDescription>
          <DialogClose
            className="dialog-x"
            aria-label={w(locale, "ปิดคำอธิบาย", "Close explanation")}
          >
            <Icon name="close" />
          </DialogClose>
          <Accordion
            type="single"
            defaultValue={term ?? "probability"}
            collapsible
            className="learn-accordion"
          >
            {glossary.map(([id, title, th, en]) => (
              <AccordionItem key={id} value={id}>
                <AccordionHeader>
                  <AccordionTrigger>
                    {title}
                    <Icon name="chevron" />
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>
                  <p>{w(locale, th, en)}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
export function ProbabilityBar({
  value,
  locale,
}: {
  value: number;
  locale: Locale;
}) {
  return (
    <div className="probability-viz">
      <div className="probability-label">
        <span>{w(locale, "เกิดขึ้น · YES", "Happens · YES")}</span>
        <strong>{probability(value, locale)}</strong>
      </div>
      <div
        className="probability-track"
        role="img"
        aria-label={w(
          locale,
          `โอกาสจากราคาตลาด ${probability(value, locale)}`,
          `Price-implied probability ${probability(value, locale)}`,
        )}
      >
        <span style={{ width: `${value * 100}%` }} />
      </div>
      <p>
        {w(
          locale,
          "นี่คือมุมมองจากราคา ไม่ใช่คำรับรองผลลัพธ์",
          "This is a view from price, not a promise of an outcome.",
        )}
      </p>
    </div>
  );
}
export function Lesson({ locale }: { locale: Locale }) {
  const [value, setValue] = useState(60);
  const [side, setSide] = useState("yes");
  const reduced = useReducedMotion();
  return (
    <section className="lesson-section page-section" id="learn" tabIndex={-1}>
      <div className="chapter-copy">
        <span className="chapter-index">
          01 /{" "}
          {w(locale, "เริ่มจากเรื่องใกล้ตัว", "A little thought experiment")}
        </span>
        <h2>{w(locale, "ถ้าพรุ่งนี้ฝนตก…", "What if it rains tomorrow?")}</h2>
        <p>
          {w(
            locale,
            "ลองเริ่มจากคำถามง่ายๆ ตลาด prediction คือพื้นที่ที่ผู้คนซื้อขายคำตอบของเหตุการณ์ที่ยังไม่รู้ผล",
            "Start with a simple question. A prediction market is a place to trade answers about events that have not been decided yet.",
          )}
        </p>
        <FriendNote>
          {w(
            locale,
            "ฉันชื่อโพลี่ ลองเลือกคำตอบ แล้วเลื่อนแถบดูนะ เรากำลังเรียนรู้ด้วยกัน ยังไม่ต้องตัดสินใจลงทุน",
            "I’m Poly. Pick an answer and move the slider. We’re learning together; there’s no investment decision to make.",
          )}
        </FriendNote>
        <a className="text-link" href="#stories">
          {w(
            locale,
            "เข้าใจแล้ว ไปดูเรื่องจริง",
            "Got it. Show me real stories",
          )}
          <Icon name="arrow" />
        </a>
      </div>
      <Card className="lesson-card">
        <Badge className="example-badge">
          {w(
            locale,
            "ตัวอย่างเพื่อเรียนรู้ · ข้อมูลสมมติ",
            "Learning example · fictional data",
          )}
        </Badge>
        <h3>{w(locale, "พรุ่งนี้ฝนจะตกไหม?", "Will it rain tomorrow?")}</h3>
        <Tabs value={side} onValueChange={setSide} className="learn-tabs">
          <TabsList aria-label={w(locale, "ลองเลือกคำตอบ", "Try an answer")}>
            <TabsTrigger value="yes">
              {w(locale, "ตก · YES", "Rain · YES")}
            </TabsTrigger>
            <TabsTrigger value="no">
              {w(locale, "ไม่ตก · NO", "No rain · NO")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="yes">
            <p>
              {w(
                locale,
                "YES คือเลือกว่าจะมีฝนตก",
                "YES is choosing that rain will happen.",
              )}
            </p>
          </TabsContent>
          <TabsContent value="no">
            <p>
              {w(
                locale,
                "NO คือเลือกว่าจะไม่มีฝนตก",
                "NO is choosing that rain will not happen.",
              )}
            </p>
          </TabsContent>
        </Tabs>
        <div className="hundred-cells" aria-hidden="true">
          {Array.from({ length: 100 }, (_, i) => (
            <motion.i
              key={i}
              animate={{ backgroundColor: i < value ? "#648fc3" : "#ecece5" }}
              transition={{ duration: reduced ? 0 : 0.15 }}
            />
          ))}
        </div>
        <label className="lesson-slider" htmlFor="lesson-probability">
          {w(
            locale,
            "สมมติว่าราคา YES สะท้อนโอกาส",
            "Imagine the YES price implies",
          )}
          <output>{value}%</output>
        </label>
        <input
          id="lesson-probability"
          type="range"
          min="1"
          max="99"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-valuetext={`${value}%`}
        />
        <p className="lesson-caption">
          {w(
            locale,
            `ราคา YES ${number(value / 100, locale)} หน่วย สะท้อนโอกาสประมาณ ${value}% · ราคา NO ${number(1 - value / 100, locale)} หน่วย`,
            `YES at ${number(value / 100, locale)} units implies about ${value}% · NO at ${number(1 - value / 100, locale)} units`,
          )}
        </p>
        <p className="fineprint">
          {w(
            locale,
            "100 ช่องเป็นภาพช่วยอธิบายสัดส่วน ไม่ใช่ผลสำรวจคน 100 คน หรือกราฟราคาจริง",
            "The 100 cells illustrate a proportion. They are not a poll of 100 people or a real price chart.",
          )}
        </p>
      </Card>
    </section>
  );
}
export function Uncertainty({ locale }: { locale: Locale }) {
  return (
    <section
      className="uncertainty page-section"
      id="uncertainty"
      tabIndex={-1}
    >
      <div>
        <span className="chapter-index">
          03 /{" "}
          {w(locale, "เว้นที่ให้ความไม่แน่นอน", "Leave room for uncertainty")}
        </span>
        <h2>
          {w(
            locale,
            "ตัวเลขเล่าได้บางอย่าง\nแต่ไม่ใช่ทุกอย่าง",
            "Numbers tell part\nof the story.",
          )}
        </h2>
      </div>
      <div className="uncertainty-list">
        {[
          [
            "clock",
            "ราคาวันนี้ เปลี่ยนได้ในวันพรุ่งนี้",
            "Today’s price can change tomorrow.",
            "ข่าวใหม่และการซื้อขายทำให้มุมมองของตลาดเปลี่ยนได้",
            "News and trading can change what the market price implies.",
          ],
          [
            "book",
            "อ่านเงื่อนไข ก่อนเลือกคำตอบ",
            "Read the rules before choosing.",
            "วันปิดตลาดกับวิธีตัดสินผลเป็นคนละเรื่อง ต้องตรวจทั้งสองอย่างจากต้นทาง",
            "A closing date and a resolution rule are different. Check both at the source.",
          ],
          [
            "search",
            "คนสนใจมาก ไม่ได้แปลว่าแน่นอน",
            "Attention is not certainty.",
            "มูลค่าซื้อขายบอกกิจกรรม ไม่ได้รับรองว่าคำตอบนั้นจะถูก",
            "Trading volume describes activity. It does not verify the answer.",
          ],
        ].map(([icon, th, en, bodyTh, bodyEn]) => (
          <div key={icon}>
            <Icon name={icon as "clock" | "book" | "search"} />
            <div>
              <h3>{w(locale, th, en)}</h3>
              <p>{w(locale, bodyTh, bodyEn)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
export function Simulator({
  market,
  locale,
  state,
  retry,
}: {
  market?: Market;
  locale: Locale;
  state: DataState;
  retry: () => void;
}) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const stake = amount.trim() === "" ? NaN : Number(amount);
  const result = market
    ? simulate(market.yes_probability, side, stake, state)
    : null;
  const validMarket =
    !!market && market.yes_probability > 0 && market.yes_probability < 1;
  const available = state === "fresh" && validMarket;
  return (
    <section className="simulation page-section" id="practice" tabIndex={-1}>
      <div className="chapter-copy">
        <span className="chapter-index">
          04 / {w(locale, "ลองโดยไม่ใช้เงินจริง", "A little room to practise")}
        </span>
        <h2>
          {w(
            locale,
            "ลองคิดก่อน\nด้วยเงินจำลอง",
            "Make room\nto try things out.",
          )}
        </h2>
        <p>
          {w(
            locale,
            "มีเงินจำลองเริ่มต้น 1,000 หน่วย คุณเลือกจำนวนเอง แล้วดูว่าจะเกิดอะไรขึ้นกับแต่ละคำตอบ",
            "Start with 1,000 imaginary units. Choose an amount yourself and explore what happens with each answer.",
          )}
        </p>
        <FriendNote>
          {w(
            locale,
            "ถ้าคำตอบผิด เงินที่ลองทั้งหมดอาจเหลือศูนย์ ดูทั้งสองกรณีไปพร้อมกันนะ",
            "If the answer is wrong, the entire amount you try may be lost. Let’s look at both outcomes together.",
          )}
        </FriendNote>
      </div>
      <Card className="simulation-card">
        <Badge>
          {w(
            locale,
            "เงินจำลองเท่านั้น · ไม่ส่งคำสั่ง",
            "Preview only · no order sent",
          )}
        </Badge>
        {market && <h3>{market.question}</h3>}
        {!available ? (
          <div className="data-message" role="status">
            <p>
              {!market
                ? w(
                    locale,
                    "เลือกเรื่องจากตลาดจริงก่อน แล้วกลับมาลองด้วยกัน",
                    "Choose a real market story first, then try this preview.",
                  )
                : w(
                    locale,
                    "ต้องมีราคาปัจจุบันที่ใช้คำนวณได้ ลองโหลดข้อมูลอีกครั้ง",
                    "A current, usable price is needed. Try refreshing the market data.",
                  )}
            </p>
            {!market ? <a className="ui-button ui-button-outline" href="#stories">{w(locale, 'เลือกเรื่องที่จะลอง', 'Choose a story to try')}<Icon name="arrow"/></a> : <Button variant="outline" onClick={retry}>
              {w(locale, "โหลดข้อมูลอีกครั้ง", "Refresh data")}
            </Button>}
          </div>
        ) : (
          <>
            <Tabs
              className="learn-tabs"
              value={side}
              onValueChange={(v) => setSide(v as "yes" | "no")}
            >
              <TabsList
                aria-label={w(locale, "คำตอบที่อยากทดลอง", "Answer to explore")}
              >
                <TabsTrigger value="yes">
                  {w(locale, "เกิดขึ้น · YES", "Happens · YES")}
                </TabsTrigger>
                <TabsTrigger value="no">
                  {w(locale, "ไม่เกิดขึ้น · NO", "Does not happen · NO")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="yes"><p>{w(locale, 'กำลังลองคำตอบว่าเหตุการณ์จะเกิดขึ้น', 'Exploring the answer that the event happens.')}</p></TabsContent>
              <TabsContent value="no"><p>{w(locale, 'กำลังลองคำตอบว่าเหตุการณ์จะไม่เกิดขึ้น', 'Exploring the answer that the event does not happen.')}</p></TabsContent>
            </Tabs>
            <label htmlFor="paper-amount">
              {w(
                locale,
                "อยากลองกี่หน่วย?",
                "How many units would you like to try?",
              )}
            </label>
            <div className="amount-input">
              <input
                id="paper-amount"
                type="number"
                min="0"
                max="1000"
                step="any"
                inputMode="decimal"
                value={amount}
                placeholder={w(locale, "ใส่จำนวนที่อยากลอง", "Enter an amount")}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="amount-help"
                aria-invalid={amount !== "" && !result}
              />
              <span>/ 1,000</span>
            </div>
            <p id="amount-help" className="fineprint">
              {w(
                locale,
                "มากกว่า 0 และไม่เกิน 1,000 หน่วย เป็นจำนวนที่คุณเลือก ไม่ใช่จำนวนเงินแนะนำ",
                "Choose more than 0 and up to 1,000 units. This is your choice, not a suggested investment amount.",
              )}
            </p>
            {result ? (
              <div className="simulation-result" aria-live="polite">
                <div className="loss-callout">
                  <span>
                    {w(
                      locale,
                      "เงินที่อาจเสียทั้งหมด",
                      "Full amount you could lose",
                    )}
                  </span>
                  <strong>
                    {number(result.maximumLoss, locale)}{" "}
                    {w(locale, "หน่วย", "units")}
                  </strong>
                </div>
                <dl className="units-summary">
                  <div>
                    <dt>
                      {w(
                        locale,
                        "ราคาต่อหน่วยสัญญาโดยประมาณ",
                        "Approximate price per contract",
                      )}
                    </dt>
                    <dd>{number(result.price, locale, 4)}</dd>
                  </div>
                  <div>
                    <dt>
                      {w(
                        locale,
                        "จำนวนหน่วยสัญญาโดยประมาณ",
                        "Approximate number of contracts",
                      )}
                    </dt>
                    <dd>{number(result.shares, locale)}</dd>
                  </div>
                </dl>
                <div className="outcome-grid">
                  <div>
                    <h4>{w(locale, "ถ้าคำตอบถูก", "If correct")}</h4>
                    <strong>{number(result.payoutIfCorrect, locale)}</strong>
                    <span>
                      {w(
                        locale,
                        "เงินที่ได้รับคืน (รวมต้นทุน)",
                        "Returned (including your stake)",
                      )}
                    </span>
                    <p>
                      {w(locale, "กำไร", "Profit")}: +
                      {number(result.profitIfCorrect, locale)}
                      <br />
                      {w(locale, "เงินจำลองคงเหลือ", "Ending balance")}:{" "}
                      {number(result.balanceIfCorrect, locale)}
                    </p>
                  </div>
                  <div>
                    <h4>{w(locale, "ถ้าคำตอบผิด", "If wrong")}</h4>
                    <strong>0</strong>
                    <span>{w(locale, "เงินที่ได้รับคืน", "Returned")}</span>
                    <p>
                      {w(locale, "ขาดทุน", "Loss")}: −
                      {number(result.maximumLoss, locale)}
                      <br />
                      {w(locale, "เงินจำลองคงเหลือ", "Ending balance")}:{" "}
                      {number(result.balanceIfWrong, locale)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="empty-preview" role="status">
                {amount === ""
                  ? w(
                      locale,
                      "ใส่จำนวนด้านบน แล้วเราจะช่วยคำนวณทั้งสองกรณี",
                      "Enter an amount above to see both outcomes.",
                    )
                  : w(
                      locale,
                      "ตรวจจำนวนอีกครั้ง ต้องมากกว่า 0 และไม่เกิน 1,000",
                      "Check the amount: more than 0 and no more than 1,000.",
                    )}
              </p>
            )}
          </>
        )}
        <p className="fineprint calculation-note">
          {w(
            locale,
            "สมมติให้สัญญาที่ถูกได้รับ 1 หน่วยและที่ผิดได้รับ 0 ใช้ราคา NO = 1 − YES แบบประมาณ ไม่รวมค่าธรรมเนียม สเปรด หรือการจับคู่จริง ผลลัพธ์นี้ไม่ถูกบันทึกเป็นพอร์ต",
            "Assumes a correct contract pays 1 unit and an incorrect one pays 0. NO is approximated as 1 − YES. Excludes fees, spread and actual fills. Results are not saved as a portfolio.",
          )}
        </p>
        <Glossary
          locale={locale}
          term="paper"
          label={w(locale, "เงินจำลองคืออะไร?", "What is a paper preview?")}
        />
      </Card>
    </section>
  );
}
export function TinyHelp({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="tiny-help" aria-label={label}>
          ?
        </button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className="learn-tooltip" sideOffset={8}>
          {children}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
