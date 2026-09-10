import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@polylove/ui";
export function Message({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={"notice " + (error ? "error" : "")}
    >
      {children}
    </p>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Buddy />
      <span>{children}</span>
    </div>
  );
}
export function Form({
  children,
  onSubmit,
  label = "บันทึก",
}: {
  children?: ReactNode;
  onSubmit: (f: FormData) => Promise<any>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const r = await onSubmit(f);
          setMessage(r?.message ?? "บันทึกแล้ว");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && <Message error>{error}</Message>}
      {message && <Message>{message}</Message>}
      <Button type="submit" disabled={busy}>
        {busy ? "กำลังดำเนินการ…" : label}
      </Button>
    </form>
  );
}
export const field = (f: FormData, k: string) => String(f.get(k) ?? "");
export function Password({
  name = "password",
  label = "รหัสผ่าน",
  newPassword = false,
}: {
  name?: string;
  label?: string;
  newPassword?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label>
      {label}
      <span className="password">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          minLength={newPassword ? 15 : undefined}
          maxLength={128}
          autoComplete={newPassword ? "new-password" : "current-password"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {show ? "ซ่อน" : "แสดง"}
        </button>
      </span>
      {newPassword && (
        <small>15–128 ตัวอักษร ใช้วลีที่จำได้ รองรับภาษาไทย</small>
      )}
    </label>
  );
}
import { Buddy } from "../beginner/illustrations";
