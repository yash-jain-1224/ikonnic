import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";

export default function NotFound() {
  return <PageContainer className="py-24 text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-ikonnic-red">404</p><h1 className="mt-3 text-4xl font-black">That page slipped out of the gift box.</h1><p className="mt-3 text-sm text-slate-500">The link may be old, but the rest of Ikonnic is ready to explore.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-ikonnic-red px-6 py-3 text-sm font-black text-white">Back home</Link></PageContainer>;
}
