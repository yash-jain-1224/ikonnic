import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Reset Password | Ikonnic" };

export default function ResetPasswordPage() {
  return (
    <PageContainer className="py-16 sm:py-24">
      <ResetPasswordForm />
    </PageContainer>
  );
}
