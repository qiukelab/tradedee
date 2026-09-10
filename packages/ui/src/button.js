import { createElement } from "react";

export function buttonClassName(variant = "default", className = "") { return ["ui-button", `ui-button-${variant}`, className].filter(Boolean).join(" "); }
export function Button({ variant = "default", className = "", type = "button", ...props }) { return createElement("button", { ...props, type, className: buttonClassName(variant, className) }); }
