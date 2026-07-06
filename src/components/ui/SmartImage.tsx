"use client";

import NextImage from "next/image";
import { useState } from "react";

type SmartImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  fallbackSrc?: string;
  wrapperClassName?: string;
  imageClassName?: string;
  skeletonClassName?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
};

export function SmartImage({
  src,
  alt,
  priority = false,
  fallbackSrc = "/images/placeholder.webp",
  wrapperClassName = "",
  imageClassName = "",
  skeletonClassName = "",
  width,
  height,
  fill = true,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);

  // Determine if it's an external URL or local
  const isExternal = activeSrc.startsWith("http://") || activeSrc.startsWith("https://");
  const isLocal = activeSrc.startsWith("/") || activeSrc.startsWith("data:");

  // For local paths and known external hosts, use next/image optimisation.
  // For unknown external hosts, fall back gracefully.
  const useNextImage = isLocal || isExternal;

  return (
    <span className={`relative block overflow-hidden bg-rosegold-50 ${wrapperClassName}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-0 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_100%)] transition-opacity duration-200 ${loaded ? "opacity-0" : "opacity-100"} ${skeletonClassName}`}
      />
      {useNextImage ? (
        fill ? (
          <NextImage
            src={activeSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`transition-opacity duration-150 ${loaded ? "opacity-100" : "opacity-0"} ${imageClassName}`}
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
            }}
            unoptimized={isExternal && !activeSrc.includes("blob.core.windows.net") && !activeSrc.includes("cdn.ikonnic.com")}
          />
        ) : (
          <NextImage
            src={activeSrc}
            alt={alt}
            width={width || 400}
            height={height || 300}
            priority={priority}
            className={`transition-opacity duration-150 ${loaded ? "opacity-100" : "opacity-0"} ${imageClassName}`}
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
            }}
            unoptimized={isExternal && !activeSrc.includes("blob.core.windows.net") && !activeSrc.includes("cdn.ikonnic.com")}
          />
        )
      ) : (
        <img
          src={activeSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className={`transition-opacity duration-150 ${loaded ? "opacity-100" : "opacity-0"} ${imageClassName}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
          }}
        />
      )}
    </span>
  );
}
