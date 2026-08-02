"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { isSiteOwner } from "@/lib/cloud-sync";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface AuthButtonProps {
  locale: Locale;
  dict: Dictionary;
  immersive?: boolean;
}

export function AuthButton({ locale, dict, immersive }: AuthButtonProps) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  if (!configured) return null;

  const btnClass = immersive
    ? "cursor-pointer rounded-md px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    : "cursor-pointer rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const normalized = email.trim().toLowerCase();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: normalized,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}`,
          },
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        setMessage(dict.auth.checkEmail);
      }
      setOpen(false);
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={btnClass}
        title={user ? dict.auth.signedIn : dict.auth.signIn}
      >
        {user ? dict.auth.account : dict.auth.signIn}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border p-4 shadow-xl ${
            immersive
              ? "border-white/15 bg-black/90 text-white"
              : "border-border bg-background text-foreground"
          }`}
        >
          {user ? (
            <div className="space-y-3">
              <p className="truncate text-xs opacity-70">{user.email}</p>
              <p className="text-[11px] opacity-55">
                {isSiteOwner(user)
                  ? dict.auth.syncHintOwner
                  : dict.auth.syncHint}
              </p>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full cursor-pointer rounded-lg border border-white/20 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
              >
                {dict.auth.signOut}
              </button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
              <p className="text-xs opacity-60">{dict.auth.signInHint}</p>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={dict.auth.email}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={dict.auth.password}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
              />
              {message && (
                <p className="text-[11px] text-amber-200/90">{message}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full cursor-pointer rounded-lg bg-white/15 px-3 py-2 text-sm transition-colors hover:bg-white/25 disabled:opacity-50"
              >
                {busy
                  ? dict.auth.working
                  : mode === "signin"
                    ? dict.auth.signIn
                    : dict.auth.signUp}
              </button>
              <button
                type="button"
                onClick={() =>
                  setMode((value) => (value === "signin" ? "signup" : "signin"))
                }
                className="w-full cursor-pointer text-left text-[11px] opacity-55 hover:opacity-90"
              >
                {mode === "signin" ? dict.auth.needAccount : dict.auth.hasAccount}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
