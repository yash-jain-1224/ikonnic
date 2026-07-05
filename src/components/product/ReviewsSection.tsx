"use client";

import { Star, ThumbsUp, Play } from "lucide-react";
import { useState } from "react";

export type Review = {
  id?: string;
  author: string;
  rating: number;
  text: string;
  date?: string;
  avatar?: string;
  photos?: string[];
  videoUrl?: string;
  verified?: boolean;
  helpful?: number;
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : star - 0.5 <= rating
                ? "fill-amber-400/50 text-amber-400"
                : "fill-slate-200 text-slate-200"
          }
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.author
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        {review.avatar ? (
          <img
            src={review.avatar}
            alt={review.author}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#d90000] to-[#ff6b6b] text-[13px] font-black text-white">
            {initials}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{review.author}</span>
            {review.verified && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                Verified
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StarRating rating={review.rating} size={12} />
            {review.date && (
              <span className="text-[11px] text-slate-400">{review.date}</span>
            )}
          </div>
        </div>
      </div>

      {review.text && (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.text}</p>
      )}

      {review.photos && review.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`Review photo ${index + 1}`}
              className="h-20 w-20 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      {review.videoUrl && (
        <div className="mt-3">
          <a
            href={review.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <Play size={14} className="text-[#d90000]" />
            Watch Video Review
          </a>
        </div>
      )}

      {review.helpful !== undefined && review.helpful > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ThumbsUp size={11} />
          {review.helpful} found this helpful
        </div>
      )}
    </div>
  );
}

/* ---------- Aggregated Rating Bar ---------- */

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-4 text-right font-bold text-slate-600">{star}</span>
      <Star size={11} className="fill-amber-400 text-amber-400" />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-slate-400">{count}</span>
    </div>
  );
}

/* ---------- Main Reviews Section ---------- */

export function ReviewsSection({
  reviews = [],
  productName,
}: {
  reviews?: Review[];
  productName?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  // Calculate aggregates
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const visibleReviews = showAll ? reviews : reviews.slice(0, 4);

  if (total === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
        <Star size={28} className="mx-auto text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-500">No reviews yet</p>
        <p className="mt-1 text-[13px] text-slate-400">
          Be the first to review {productName || "this product"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-black text-[#07142f]">
        Customer Reviews ({total})
      </h3>

      {/* Summary bar */}
      <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="text-center sm:w-40">
          <div className="text-4xl font-black text-[#07142f]">{avg.toFixed(1)}</div>
          <div className="mt-1">
            <StarRating rating={Math.round(avg)} size={16} />
          </div>
          <p className="mt-1 text-[12px] text-slate-400">{total} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, count }) => (
            <RatingBar key={star} star={star} count={count} total={total} />
          ))}
        </div>
      </div>

      {/* Review cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visibleReviews.map((review, index) => (
          <ReviewCard key={review.id || index} review={review} />
        ))}
      </div>

      {total > 4 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          Show All {total} Reviews
        </button>
      )}
    </div>
  );
}
