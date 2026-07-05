import { PageContainer } from "@/components/ui/PageContainer";
import { policies } from "@/data/policies";

export function PolicyPage({ policyKey }: { policyKey: keyof typeof policies }) {
  const policy = policies[policyKey];
  return (
    <PageContainer className="py-10 sm:py-14">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-ikonnic-red">Ikonnic information</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">{policy.title}</h1>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">{policy.intro}</p>
        <div className="mt-8 space-y-8">{policy.sections.map(([title, body]) => <section key={title}><h2 className="text-lg font-black text-slate-900">{title}</h2><p className="mt-2 text-sm leading-7 text-slate-600">{body}</p></section>)}</div>
      </article>
    </PageContainer>
  );
}
