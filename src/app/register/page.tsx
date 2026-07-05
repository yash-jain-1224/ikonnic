import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Create Account | Ikonnic" };

export default function RegisterPage() {
  return (
    <PageContainer className="py-16 sm:py-24">
      <RegisterForm />
    </PageContainer>
  );
}
