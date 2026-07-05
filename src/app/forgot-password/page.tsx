import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Forgot Password | Ikonnic" };

export default function ForgotPasswordPage() {
  return (
    <PageContainer className="py-16 sm:py-24">
      <ForgotPasswordForm />
    </PageContainer>
  );
}
