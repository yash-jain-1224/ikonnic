"use client";

import { useState } from "react";
import { BlogCard } from "@/components/blog/BlogCard";
import type { BlogPost } from "@/types";

export function BlogList({ posts }: { posts: BlogPost[] }) {
  const [visible, setVisible] = useState(6);
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{posts.slice(0, visible).map((post) => <BlogCard key={post.slug} post={post} />)}</div>
      {visible < posts.length ? <div className="mt-8 text-center"><button type="button" onClick={() => setVisible(posts.length)} className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-800 hover:border-giftora-red hover:text-giftora-red">Load More</button></div> : null}
    </>
  );
}
