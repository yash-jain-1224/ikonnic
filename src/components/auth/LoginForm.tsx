"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { authAPI } from "@/lib/api";

type AuthMode = "login" | "register" | "forgot";

const SSO_ERRORS: Record<string, string> = {
  sso_failed: "Microsoft sign-in failed. Please try again or use your password.",
  sso_cancelled: "Microsoft sign-in was cancelled.",
  sso_unconfigured: "Microsoft sign-in is not available right now.",
};

export function LoginForm() {
  const router = useRouter();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>("login");
  const [success, setSuccess] = useState("");
  const [ssoError, setSsoError] = useState("");

  // Surface errors returned by the SSO callback redirect (?error=sso_*)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code && SSO_ERRORS[code]) setSsoError(SSO_ERRORS[code]);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setSuccess("");
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "login") {
        await login(String(form.get("identity")), String(form.get("password")));
        router.push("/account");
      } else if (mode === "register") {
        const fullName = String(form.get("name") || "").trim();
        const [firstName, ...rest] = fullName.split(" ");
        await register({
          email: String(form.get("identity")),
          firstName,
          lastName: rest.join(" ") || undefined,
          password: String(form.get("password")),
        });
        router.push("/account");
      } else if (mode === "forgot") {
        await authAPI.forgotPassword(String(form.get("identity")));
        setSuccess("If the email exists, a reset OTP has been sent. Check your inbox.");
      }
    } catch {
      // Error is set in the store
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-9">
      <div className="mx-auto inline-flex items-center gap-1 rounded-sm bg-black px-2.5 py-1 text-sm font-black tracking-[0.12em] text-white">IKONNIC<span className="grid size-4 place-items-center rounded-sm bg-ikonnic-red text-[9px]">◆</span></div>
      <h1 className="mt-6 text-2xl font-black text-slate-950">{mode === "register" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {mode === "forgot" ? "Enter your email to receive a password reset OTP." : "Sign in to manage your orders, wishlist, and profile."}
      </p>

      {mode === "register" && (
        <label className="mt-6 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
          Full name
          <input required name="name" placeholder="Your name" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
        </label>
      )}

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        {mode === "forgot" ? "Email" : "Email or phone"}
        <input required name="identity" type={mode === "forgot" ? "email" : "text"} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      {mode !== "forgot" && (
        <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
          Password
          <input required name="password" type="password" placeholder="••••••••" minLength={6} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
        </label>
      )}

      {(error || ssoError) && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertCircle size={16} />{error || ssoError}
        </p>
      )}

      {success && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={16} />{success}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-6 py-3.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
        {mode === "forgot" ? "Send reset OTP" : mode === "register" ? "Create account" : "Sign in"}
        {!isLoading && <ArrowRight size={16} />}
      </button>

      {mode !== "forgot" && (
        <>
          <div className="mt-5 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.13em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
          </div>
          <a
            href="/api/auth/signin/azure-ad"
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-black text-slate-800 hover:bg-slate-50"
          >
            <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continue with Microsoft
          </a>
        </>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-bold">
        <button type="button" onClick={() => { setMode("login"); clearError(); setSuccess(""); }} className={`${mode === "login" ? "text-ikonnic-red" : "text-slate-600"} hover:text-ikonnic-red`}>Login</button>
        <button type="button" onClick={() => { setMode("register"); clearError(); setSuccess(""); }} className={`${mode === "register" ? "text-ikonnic-red" : "text-slate-600"} hover:text-ikonnic-red`}>Register</button>
        <button type="button" onClick={() => { setMode("forgot"); clearError(); setSuccess(""); }} className={`${mode === "forgot" ? "text-ikonnic-red" : "text-slate-600"} hover:text-ikonnic-red`}>Forgot password</button>
      </div>

      <Link href="/account" className="mt-4 block text-center text-xs font-black text-ikonnic-red">Go to account →</Link>
    </form>
  );
}
