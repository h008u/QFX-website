"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getBrowserClient } from "./supabase/client";

/** المستخدم الحالي في المتصفح (null = زائر، undefined = جارٍ التحميل) */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) {
      setUser(null);
      return;
    }
    sb.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}
