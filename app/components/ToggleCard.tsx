"use client";
import { useId, useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export default function ToggleCard({
  title,
  children,
  defaultOpen = false,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className={`card ${className ?? ""}`} style={{ padding: 20 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="toggle-head"
        style={{
          all: "unset",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        <span aria-hidden style={{ transition: "transform .15s ease" }}>
          {open ? "▼" : "▶"}
        </span>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </button>

      {open && (
        <div id={id} style={{ marginTop: 12 }}>
          {children}
        </div>
      )}
    </section>
  );
}
