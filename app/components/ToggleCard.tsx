"use client";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean; // 渡さなければ閉じて開始
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

  // パネルの中身の高さを計測して、CSS変数に渡す
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [panelH, setPanelH] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setPanelH(el.scrollHeight);
    measure();
    // 中身の変化にも追従
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // ウィンドウサイズ変化でも追従
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      className={`toggleCard ${className ?? ""}`}
      data-open={open ? "true" : "false"}
      style={{
        padding: 20,
        /* CSS変数をセット */ ["--panel-h" as any]: `${panelH} + 10px`,
      }}
    >
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
        <span className="chev" aria-hidden>
          ▶
        </span>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </button>

      <div
        id={id}
        className="toggle-panel"
        // wrapperの中に内容を入れる（高さ計測は innerRef で）
      >
        <div ref={innerRef}>{children}</div>
      </div>
    </section>
  );
}
