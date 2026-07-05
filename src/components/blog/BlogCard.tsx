import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/types";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card">
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden"><img src={post.image} alt="" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.04]" /></Link>
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ikonnic-red">{post.date}</p>
        <Link href={`/blog/${post.slug}`}><h2 className="mt-2 text-lg font-black leading-snug text-slate-900 group-hover:text-ikonnic-red">{post.title}</h2></Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex items-center gap-1 text-xs font-black text-slate-800 hover:text-ikonnic-red">Read article <ArrowUpRight size={14} /></Link>
      </div>
    </article>
  );
}
