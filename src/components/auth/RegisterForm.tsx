"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuthStore } from "@/store/auth";

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [phone, setPhone] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("name") || "").trim();
    const [firstName, ...rest] = fullName.split(" ");

    try {
      await register({
        email: String(form.get("email")),
        phone: phone || undefined,
        firstName,
        lastName: rest.join(" ") || undefined,
        password: String(form.get("password")),
      });
      router.push("/account");
    } catch {
      // Error is set in the store
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-rosegold-200/60 bg-white p-7 shadow-card sm:p-9">
      <div className="mx-auto inline-flex items-center gap-1 rounded-sm bg-black px-2.5 py-1 text-sm font-black tracking-[0.12em] text-white">
        IKONNIC<span className="grid size-4 place-items-center rounded-sm bg-ikonnic-red text-[9px]">◆</span>
      </div>
      <h1 className="mt-6 text-2xl font-black text-slate-950">Create account</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Join Ikonnic for faster checkout, order tracking, and exclusive offers.
      </p>

      <label className="mt-6 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Full name *
        <input required name="name" placeholder="Your full name" className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Email *
        <input required name="email" type="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Phone (optional)
        <input name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX" className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Password *
        <input required name="password" type="password" placeholder="Min 6 characters" minLength={6} className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertCircle size={16} />{error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-6 py-3.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
        Create account
        {!isLoading && <ArrowRight size={16} />}
      </button>

      <p className="mt-4 text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-black text-ikonnic-red hover:underline">Sign in</Link>
      </p>

      <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
        By creating an account you agree to our{" "}
        <Link href="/terms-conditions" className="underline">Terms</Link> and{" "}
        <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
