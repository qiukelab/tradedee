import { createElement } from "react";

export function Card({ className = "", ...props }) { return createElement("article", { ...props, className: ["ui-card", className].filter(Boolean).join(" ") }); }
