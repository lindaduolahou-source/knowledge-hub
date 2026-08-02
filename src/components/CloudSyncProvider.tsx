"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  CLOUD_SYNC_EVENTS,
  keysForEvent,
  pushStore,
  syncOnLogin,
} from "@/lib/cloud-sync";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * When the owner is signed in, keep localStorage ↔ Supabase in sync.
 * Visitors without login keep using local/published content as before.
 */
export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const userRef = useRef<User | null>(null);
  const pushTimers = useRef<Map<string, number>>(new Map());
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    async function schedulePush(names: string[]) {
      if (!userRef.current || syncingRef.current) return;
      for (const name of names) {
        const existing = pushTimers.current.get(name);
        if (existing) window.clearTimeout(existing);
        const timer = window.setTimeout(() => {
          void pushStore(supabase, name);
          pushTimers.current.delete(name);
        }, 600);
        pushTimers.current.set(name, timer);
      }
    }

    async function onSignedIn(user: User) {
      userRef.current = user;
      syncingRef.current = true;
      try {
        await syncOnLogin(supabase);
      } finally {
        syncingRef.current = false;
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void onSignedIn(data.session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void onSignedIn(session.user);
      }
      if (event === "SIGNED_OUT") {
        userRef.current = null;
      }
    });

    function onAppEvent(event: Event) {
      const names = keysForEvent(event.type);
      if (names.length === 0) return;
      void schedulePush(names);
    }

    for (const eventName of CLOUD_SYNC_EVENTS) {
      window.addEventListener(eventName, onAppEvent);
    }

    return () => {
      subscription.unsubscribe();
      for (const eventName of CLOUD_SYNC_EVENTS) {
        window.removeEventListener(eventName, onAppEvent);
      }
      for (const timer of pushTimers.current.values()) {
        window.clearTimeout(timer);
      }
      pushTimers.current.clear();
    };
  }, []);

  return <>{children}</>;
}
