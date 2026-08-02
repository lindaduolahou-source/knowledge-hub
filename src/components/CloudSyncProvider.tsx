"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  CLOUD_SYNC_EVENTS,
  isSiteOwner,
  keysForEvent,
  pullPublicDefaults,
  pushStore,
  pushUserStore,
  syncOnLogin,
} from "@/lib/cloud-sync";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * - Logged-out visitors pull official defaults from `site_stores`.
 * - Site owner edits / login push local stores to `site_stores` (product defaults).
 * - Regular users edit write to `user_stores` (private per account).
 *
 * Important: do not pull public defaults before auth is known — that used to
 * overwrite the owner's local mind maps with older cloud rows.
 */
export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const userRef = useRef<User | null>(null);
  const pushTimers = useRef<Map<string, number>>(new Map());
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    async function schedulePush(names: string[]) {
      const user = userRef.current;
      if (!user || syncingRef.current) return;
      for (const name of names) {
        const existing = pushTimers.current.get(name);
        if (existing) window.clearTimeout(existing);
        const timer = window.setTimeout(() => {
          const current = userRef.current;
          if (!current) return;
          if (isSiteOwner(current)) {
            void pushStore(supabase, name);
          } else {
            void pushUserStore(supabase, current.id, name);
          }
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

    void supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await onSignedIn(data.session.user);
      } else {
        await pullPublicDefaults(supabase);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is handled by getSession() above to avoid a double sync
      // that could race and wipe local owner content.
      if (session?.user && event === "SIGNED_IN") {
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
