import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return <PageContainer className="py-16 sm:py-24"><LoginForm /></PageContainer>;
}
