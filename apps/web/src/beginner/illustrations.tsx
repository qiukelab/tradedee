import type { SVGProps } from "react";

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | "arrow"
    | "menu"
    | "close"
    | "search"
    | "book"
    | "spark"
    | "check"
    | "globe"
    | "chevron"
    | "clock"
    | "wallet";
}) {
  const paths = {
    arrow: "M4 12h16m-6-6 6 6-6 6",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "m6 6 12 12M6 18 18 6",
    search: "m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    book: "M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z",
    spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
    check: "m5 12 4 4L19 6",
    globe:
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
    chevron: "m6 9 6 6 6-6",
    clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2",
    wallet: "M3 7V5h16v3M3 7h18v13H3Zm12 5h6v4h-6Z",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Buddy({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 160"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="90" cy="146" rx="55" ry="8" fill="#223e6420" />
      <path
        d="M31 72C15 36 50 16 72 27 93 0 128 14 133 40c34 3 41 36 23 55 13 30-10 51-35 43-16 24-48 20-59 1-32 3-48-20-31-43-7-8-7-16 0-24Z"
        fill="#aecff5"
        stroke="#2c5585"
        strokeWidth="2"
      />
      <ellipse cx="73" cy="80" rx="5" ry="8" fill="#233d5c" />
      <ellipse cx="112" cy="80" rx="5" ry="8" fill="#233d5c" />
      <path
        d="M82 97q12 12 23-1"
        stroke="#233d5c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="59" cy="94" rx="9" ry="5" fill="#f0ae9a" />
      <ellipse cx="127" cy="94" rx="9" ry="5" fill="#f0ae9a" />
      <path
        d="m128 29 7-13 7 13 14 4-14 5-7 13-7-13-13-5Z"
        fill="#f2ca70"
        stroke="#8d6a29"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function StoryWorld() {
  return (
    <svg
      className="story-world"
      viewBox="0 0 1440 740"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M650 720c70-220 520-5 570-270 30-160-160-215-30-450H1440v740Z"
        fill="#e7f0f6"
      />
      <path
        d="M760 700c-30-130 200-85 250-183s-65-160 56-229 247-20 284-180"
        stroke="#99b6c5"
        strokeWidth="2"
        strokeDasharray="5 10"
      />
      <g transform="translate(990 110) rotate(9)">
        <rect
          width="215"
          height="168"
          rx="14"
          fill="#fffdfa"
          stroke="#9baebc"
          strokeWidth="2"
        />
        <path d="M0 43h215" stroke="#9baebc" strokeWidth="2" />
        <path
          d="M48-10v29m117-29v29"
          stroke="#456584"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <rect x="26" y="68" width="45" height="35" rx="6" fill="#cee1f5" />
        <rect x="85" y="68" width="45" height="35" rx="6" fill="#f1d58f" />
        <rect x="144" y="68" width="45" height="35" rx="6" fill="#deeadf" />
        <path
          d="M30 125h150m-150 16h98"
          stroke="#c4ced4"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(845 320) rotate(-12)">
        <rect
          width="156"
          height="195"
          rx="12"
          fill="#fffdfa"
          stroke="#9baebc"
          strokeWidth="2"
        />
        <rect x="22" y="22" width="112" height="59" rx="6" fill="#d5e5dc" />
        <path d="m39 62 20-20 18 14 30-21" stroke="#60937c" strokeWidth="3" />
        <path
          d="M23 105h107m-107 22h107m-107 22h74m-74 22h88"
          stroke="#a7b9c7"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(1170 430) rotate(12)">
        <circle r="62" fill="#fdfbf480" stroke="#5b82a9" strokeWidth="13" />
        <path
          d="m45 48 63 70"
          stroke="#5b82a9"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d="M-25-22q22-23 44-6"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <g fill="#e8c36f">
        <path d="m950 83 5-16 6 16 15 5-15 5-6 16-5-16-16-5Z" />
        <circle cx="1327" cy="334" r="7" />
        <circle cx="760" cy="531" r="6" />
      </g>
      <path
        d="M1235 681c-3-64 3-84 20-110m-21 74c-39 0-48-23-44-34 23-5 43 12 44 34m8-30c3-31 20-40 35-37 0 21-17 36-35 37"
        stroke="#86a68e"
        strokeWidth="3"
        fill="#cedecc"
      />
    </svg>
  );
}
