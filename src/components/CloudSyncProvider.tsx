"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  CLOUD_SYNC_EVENTS,
  isSiteOwner,
  keysForEvent,
  pullPublicDefaults,
  pushStore,
  syncOnLogin,
} from "@/lib/cloud-sync";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Phase 1:
 * - Everyone (including visitors) pulls public defaults from `site_stores`.
 * - Only the site owner pushes edits back to `site_stores`.
 * Phase 2 will add per-user `user_stores` for normal accounts.
 */
export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const userRef = useRef<User | null>(null);
  const pushTimers = useRef<Map<string, number>>(new Map());
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    async function schedulePush(names: string[]) {
      if (!isSiteOwner(userRef.current) || syncingRef.current) return;
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
        await syncOnLogin(supabase, user);
      } finally {
        syncingRef.current = false;
      }
    }

    // Visitors + owner: hydrate official defaults as soon as the app loads.
    void pullPublicDefaults(supabase);

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
        void pullPublicDefaults(supabase);
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
