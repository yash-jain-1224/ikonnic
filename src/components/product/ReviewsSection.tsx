"use client";

import { Star, ThumbsUp, Play, PenLine } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { reviewsAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

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
    <div className="rounded-2xl border border-rosegold-200/40 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        {review.avatar ? (
          <img
            src={review.avatar}
            alt={review.author}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-rosegold-500 to-rosegold-300 text-[13px] font-black text-white">
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
            className="inline-flex items-center gap-2 rounded-xl bg-rosegold-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-rosegold-100"
          >
            <Play size={14} className="text-ikonnic-red" />
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
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-rosegold-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-slate-400">{count}</span>
    </div>
  );
}

/* ---------- Write Review Form ---------- */

function WriteReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const { isAuthenticated } = useAuthStore();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="mt-4 rounded-2xl border border-rosegold-200/40 bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">Sign in to write a review</p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-xl bg-ikonnic-red px-5 py-2.5 text-sm font-black text-white transition hover:bg-rosegold-600"
        >
          Log In
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-bold text-emerald-700">Thanks for your review!</p>
        <p className="mt-1 text-[12px] text-emerald-600">It will appear here once approved by our team.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }
    if (text.trim().length < 10) {
      setError("Please write at least 10 characters");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reviewsAPI.create({ productId, rating, text: text.trim() });
      setSubmitted(true);
      onDone();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not submit review. Please try again.";
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-rosegold-200/40 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-slate-900">Your Rating</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={24}
              className={
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }
            />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Share your experience with this product..."
        className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-ikonnic-red"
      />
      {error && <p className="mt-2 text-[12px] font-bold text-ikonnic-red">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-xl bg-ikonnic-red px-6 py-3 text-sm font-black text-white transition hover:bg-rosegold-600 disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

/* ---------- Main Reviews Section ---------- */

export function ReviewsSection({
  reviews = [],
  productName,
  productId,
}: {
  reviews?: Review[];
  productName?: string;
  productId?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Calculate aggregates
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  const visibleReviews = showAll ? reviews : reviews.slice(0, 4);

  const writeReviewButton = productId && !showForm && (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="inline-flex items-center gap-2 rounded-xl border border-rosegold-200/60 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-ikonnic-red hover:text-ikonnic-red"
    >
      <PenLine size={14} />
      Write a Review
    </button>
  );

  if (total === 0) {
    return (
      <div className="mt-8">
        <div className="rounded-2xl border border-rosegold-200/40 bg-rosegold-50 p-8 text-center">
          <Star size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-500">No reviews yet</p>
          <p className="mt-1 text-[13px] text-slate-400">
            Be the first to review {productName || "this product"}
          </p>
          {writeReviewButton && <div className="mt-4">{writeReviewButton}</div>}
        </div>
        {productId && showForm && <WriteReviewForm productId={productId} onDone={() => {}} />}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-black text-[#07142f]">
          Customer Reviews ({total})
        </h3>
        {writeReviewButton}
      </div>
      {productId && showForm && <WriteReviewForm productId={productId} onDone={() => {}} />}

      {/* Summary bar */}
      <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-rosegold-200/40 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
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
          className="mt-4 w-full rounded-xl border border-rosegold-200/60 bg-white py-3 text-sm font-black text-slate-700 transition hover:bg-rosegold-100"
        >
          Show All {total} Reviews
        </button>
      )}
    </div>
  );
}
