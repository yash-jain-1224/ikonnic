"use client";

export function FilterPills({
  filters,
  selected,
  onChange,
}: {
  filters: string[];
  selected: string;
  onChange: (filter: string) => void;
}) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2" aria-label="Product filters">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            selected === filter
              ? "border-ikonnic-red bg-ikonnic-red text-white shadow-soft"
              : "border-rosegold-200 bg-white text-rosegold-900 hover:border-rosegold-300 hover:text-ikonnic-red"
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
