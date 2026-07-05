"use client";

import type { ImgHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";

type SmartImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "loading"> & {
  src: string;
  alt: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  fallbackSrc?: string;
  wrapperClassName?: string;
  imageClassName?: string;
  skeletonClassName?: string;
};

const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export function SmartImage({
  src,
  alt,
  priority = false,
  loading,
  fallbackSrc = "/images/placeholder.webp",
  wrapperClassName = "",
  imageClassName = "",
  skeletonClassName = "",
  onLoad,
  onError,
  ...props
}: SmartImageProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);
  const resolvedLoading = loading ?? "eager";

  useEffect(() => {
    setLoaded(false);
    setActiveSrc(src);
    setShouldLoad(priority);
  }, [priority, src]);

  useEffect(() => {
    if (priority || shouldLoad) return;

    const target = wrapperRef.current;
    if (!target) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1400px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  useEffect(() => {
    const image = imageRef.current;
    if (shouldLoad && image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeSrc, shouldLoad]);

  return (
    <span ref={wrapperRef} className={`relative block overflow-hidden bg-slate-50 ${wrapperClassName}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-0 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] transition-opacity duration-200 ${loaded ? "opacity-0" : "opacity-100"} ${skeletonClassName}`}
      />
      <img
        {...props}
        ref={imageRef}
        src={shouldLoad ? activeSrc : transparentPixel}
        alt={alt}
        loading={resolvedLoading}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          if (activeSrc !== fallbackSrc) {
            setActiveSrc(fallbackSrc);
            return;
          }
          onError?.(event);
        }}
        className={`transition-opacity duration-150 ${loaded ? "opacity-100" : "opacity-0"} ${imageClassName}`}
      />
    </span>
  );
}
