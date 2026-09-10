import { createElement } from "react";

export function Badge({ className = "", ...props }) { return createElement("span", { ...props, className: ["ui-badge", className].filter(Boolean).join(" ") }); }
