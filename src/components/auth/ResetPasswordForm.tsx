"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { authAPI } from "@/lib/api";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmPassword = String(form.get("confirmPassword"));

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword(
        String(form.get("email")),
        String(form.get("otp")),
        password,
      );
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Reset failed. Please check the OTP and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-9">
      <div className="mx-auto inline-flex items-center gap-1 rounded-sm bg-black px-2.5 py-1 text-sm font-black tracking-[0.12em] text-white">
        IKONNIC<span className="grid size-4 place-items-center rounded-sm bg-ikonnic-red text-[9px]">◆</span>
      </div>
      <h1 className="mt-6 text-2xl font-black text-slate-950">Reset password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enter the OTP sent to your email and choose a new password.
      </p>

      <label className="mt-6 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Email
        <input required type="email" name="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        OTP Code
        <input required name="otp" placeholder="6-digit OTP" maxLength={6} inputMode="numeric" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        New Password
        <input required name="password" type="password" placeholder="Min 6 characters" minLength={6} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      <label className="mt-5 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Confirm Password
        <input required name="confirmPassword" type="password" placeholder="Re-enter password" minLength={6} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red" />
      </label>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          <AlertCircle size={16} />{error}
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
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-6 py-3.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
        Reset password
        {!isLoading && <ArrowRight size={16} />}
      </button>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/forgot-password" className="font-black text-ikonnic-red hover:underline">Resend OTP</Link>
        {" · "}
        <Link href="/login" className="font-black text-ikonnic-red hover:underline">Back to login</Link>
      </p>
    </form>
  );
}
