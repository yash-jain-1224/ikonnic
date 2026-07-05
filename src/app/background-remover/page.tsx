import type { Metadata } from "next";
import { BackgroundRemoverClient } from "@/components/tools/BackgroundRemoverClient";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = { title: "Free Background Remover" };

export default function BackgroundRemoverPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-3xl font-black text-slate-950">Free Background Remover</h1>
      <p className="mb-7 mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        Upload an image, preview the before/after state, and send it into Giftora customisation. Actual AI processing is wired as an API placeholder.
      </p>
      <BackgroundRemoverClient />
    </PageContainer>
  );
}
