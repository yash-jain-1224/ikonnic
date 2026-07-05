import type { Metadata } from "next";
import { BlogList } from "@/components/blog/BlogList";
import { PageContainer } from "@/components/ui/PageContainer";
import { blogPosts } from "@/data/blog";

export const metadata: Metadata = { title: "Ideas & Stories" };

export default function BlogPage() {
  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mb-8 max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-giftora-red">Giftora journal</p><h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Ideas for more personal spaces and gifts</h1><p className="mt-3 text-sm leading-6 text-slate-500">Photo tips, thoughtful gifting guides, and practical ways to display the moments you care about.</p></div>
      <BlogList posts={blogPosts} />
    </PageContainer>
  );
}
