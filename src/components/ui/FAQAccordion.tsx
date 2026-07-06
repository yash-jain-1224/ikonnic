"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type FAQItem = {
  question: string;
  answer: string;
};

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className="overflow-hidden rounded-2xl border border-rosegold-200/60 bg-white">
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between bg-white px-6 py-5 text-left transition hover:bg-rosegold-100"
              aria-expanded={isOpen}
            >
              <span className="font-bold text-slate-900">{item.question}</span>
              <ChevronDown
                size={20}
                className={`text-slate-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
