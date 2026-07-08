"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { authAPI } from "@/lib/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await authAPI.forgotPassword(email);
      setSuccess("If the email exists, a reset OTP has been sent. Check your inbox.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-3xl border border-rosegold-200/60 bg-white p-7 shadow-card sm:p-9">
      <Image src="/images/ikonnic-wbg.png" alt="Ikonnic" width={150} height={44} className="mx-auto h-11 w-auto" />
      <h1 className="mt-6 text-2xl font-black text-slate-950">Forgot password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enter your registered email address and we&apos;ll send you an OTP to reset your password.
      </p>

      <label className="mt-6 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full rounded-xl border border-rosegold-200 px-4 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-ikonnic-red"
        />
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
        Send reset OTP
        {!isLoading && <ArrowRight size={16} />}
      </button>

      {success && (
        <Link
          href="/reset-password"
          className="mt-3 block text-center text-sm font-black text-ikonnic-red hover:underline"
        >
          I have the OTP → Reset password
        </Link>
      )}

      <p className="mt-4 text-center text-xs text-slate-500">
        Remember your password?{" "}
        <Link href="/login" className="font-black text-ikonnic-red hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
