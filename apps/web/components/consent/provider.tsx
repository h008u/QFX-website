"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, DENY_ALL, effective, parse, serialise, type Category, type Consent } from "@/lib/consent";
import { REF_COOKIE, REF_MAX_AGE, sanitizeRef } from "@/lib/referral";

const PENDING_REF = "qfx-pending-ref";

type Ctx = {
  consent: Consent;
  answered: boolean;
  ready: boolean;
  save: (c: Consent) => void;
  reopen: () => void;
  chooserOpen: boolean;
  closeChooser: () => void;
};

const ConsentContext = createContext<Ctx>({
  consent: DENY_ALL,
  answered: false,
  ready: false,
  save: () => {},
  reopen: () => {},
  chooserOpen: false,
  closeChooser: () => {},
});

export const useConsent = () => useContext(ConsentContext);

/** «هل أحمّل هذا؟» */
export function useAllowed(category: Category): boolean {
  const { consent, ready } = useConsent();
  return ready && consent[category];
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[2]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; samesite=lax${secure}`;
}

/** يحفظ رمز الإحالة الذي ينتظر الموافقة كوكياً عندما يُسمح بذلك */
function flushPendingRef(c: Consent) {
  try {
    const pending = sessionStorage.getItem(PENDING_REF);
    if (pending && c.marketing) {
      writeCookie(REF_COOKIE, pending, REF_MAX_AGE);
      sessionStorage.removeItem(PENDING_REF);
    }
    if (!c.marketing && readCookie(REF_COOKIE)) writeCookie(REF_COOKIE, "", 0); // سحب الموافقة يحذف الكوكي
  } catch {
    /* التخزين غير متاح */
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent>(DENY_ALL);
  const [answered, setAnswered] = useState(false);
  const [ready, setReady] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  // نقرأ الاختيار بعد التحميل: رسم الشريط على الخادم سيسرّب إجابة زائر لصفحة مخزّنة لزائر آخر
  useEffect(() => {
    const stored = parse(readCookie(CONSENT_COOKIE));
    const ref = sanitizeRef(new URLSearchParams(location.search).get("ref"));
    if (ref) {
      try {
        sessionStorage.setItem(PENDING_REF, ref); // رمز الإحالة يبقى في الجلسة فقط حتى الموافقة
      } catch {
        /* */
      }
    }
    const c = effective(stored);
    setConsent(c);
    setAnswered(stored !== null);
    setReady(true);
    if (stored) flushPendingRef(c);
  }, []);

  const save = useCallback((next: Consent) => {
    writeCookie(CONSENT_COOKIE, serialise(next), CONSENT_MAX_AGE_DAYS * 86400);
    setConsent(next);
    setAnswered(true);
    setChooserOpen(false);
    flushPendingRef(next);
  }, []);

  return (
    <ConsentContext.Provider
      value={{ consent, answered, ready, save, reopen: () => setChooserOpen(true), chooserOpen, closeChooser: () => setChooserOpen(false) }}
    >
      {children}
    </ConsentContext.Provider>
  );
}
