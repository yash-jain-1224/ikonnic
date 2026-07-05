import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogCard } from "@/components/blog/BlogCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { PageContainer } from "@/components/ui/PageContainer";
import { blogBySlug, blogPosts } from "@/data/blog";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: blogBySlug(slug)?.title ?? "Article" };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogBySlug(slug);
  if (!post) notFound();
  const related = blogPosts.filter((item) => item.slug !== slug).slice(0, 3);
  return (
    <PageContainer className="py-8 sm:py-12">
      <Breadcrumb current={post.title} parent={{ label: "Blog", href: "/blog" }} />
      <article className="mx-auto mt-6 max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-ikonnic-red">{post.date}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">{post.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">{post.excerpt}</p>
        <img src={post.image} alt="" className="mt-8 aspect-[16/8] w-full rounded-3xl border border-slate-200 object-cover shadow-card" />
        <div className="mx-auto mt-9 max-w-2xl space-y-6 text-base leading-8 text-slate-700">{post.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </article>
      <section className="mt-16"><h2 className="mb-5 text-2xl font-black">Related articles</h2><div className="grid gap-5 md:grid-cols-3">{related.map((item) => <BlogCard key={item.slug} post={item} />)}</div></section>
    </PageContainer>
  );
}
