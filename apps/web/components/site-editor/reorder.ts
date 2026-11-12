"use client";

import { useRef, useState } from "react";

/**
 * سحب لإعادة الترتيب بمؤشر الفأرة أو اللمس (يعمل على الجوال بخلاف Drag & Drop الأصلي).
 * ضع data-reorder-idx={i} على كل عنصر، و onPointerDown={start(i)} على مقبض السحب (مع touch-action: none).
 */
export function usePointerReorder(onMove: (from: number, to: number) => void, attr = "data-reorder-idx") {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const cb = useRef(onMove);
  cb.current = onMove;

  const start = (idx: number) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    setFrom(idx);
    setOver(idx);
    document.documentElement.classList.add("is-reordering");
    let last = idx;
    const find = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)?.closest(`[${attr}]`);
      return el ? Number(el.getAttribute(attr)) : null;
    };
    const move = (ev: PointerEvent) => {
      const f = find(ev.clientX, ev.clientY);
      if (f !== null && !Number.isNaN(f)) last = f;
      setOver(last);
      const edge = 80;
      if (ev.clientY < edge) window.scrollBy(0, -20);
      else if (ev.clientY > window.innerHeight - edge) window.scrollBy(0, 20);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.classList.remove("is-reordering");
      if (last !== idx) cb.current(idx, last);
      setFrom(null);
      setOver(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return { from, over, start };
}
