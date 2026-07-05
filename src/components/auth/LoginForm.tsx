"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register" | "forgot";

export function LoginForm() {
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-9">
      <div className="mx-auto inline-flex items-center gap-1 rounded-sm bg-black px-2.5 py-1 text-sm font-black tracking-[0.12em] text-white">GIFTORA<span className="grid size-4 place-items-center rounded-sm bg-giftora-red text-[9px]">◆</span></div>
      <h1 className="mt-6 text-2xl font-black text-slate-950">{mode === "register" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Auth is a demo shell with provider/database hooks documented in the API spec.</p>
      {mode === "register" ? (
        <label className="mt-6 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
          Full name
          <input required name="name" placeholder="Your name" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-giftora-red" />
        </label>
      ) : null}
      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Email or phone
        <input required name="identity" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-giftora-red" />
      </label>
      {mode !== "forgot" ? (
        <label className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-600">
          <input type="checkbox" name="remember" className="size-4 accent-giftora-red" />
          Remember me on this device
        </label>
      ) : null}
      <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-giftora-red px-6 py-3.5 text-sm font-black text-white hover:bg-red-700">
        {mode === "forgot" ? "Send reset link" : "Continue"} <ArrowRight size={16} />
      </button>
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-bold">
        <button type="button" onClick={() => { setMode("login"); setSent(false); }} className="text-slate-600 hover:text-giftora-red">Login</button>
        <button type="button" onClick={() => { setMode("register"); setSent(false); }} className="text-slate-600 hover:text-giftora-red">Register</button>
        <button type="button" onClick={() => { setMode("forgot"); setSent(false); }} className="text-slate-600 hover:text-giftora-red">Forgot password</button>
      </div>
      {sent ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} />Demo auth message sent.</p> : null}
      <Link href="/account" className="mt-4 block text-center text-xs font-black text-giftora-red">Continue to account demo</Link>
    </form>
  );
}
