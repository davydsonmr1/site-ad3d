"use client";

import { cn } from "@/lib/utils";

interface SecureImageProps {
  /** Pre-signed URL (minted server-side via assetUrl) or a public path. */
  src: string;
  alt: string;
  className?: string;
  /** Eager-load + high priority (use for above-the-fold assets). */
  priority?: boolean;
  /** Stretch to fill the positioned parent (parent must be relative). */
  fill?: boolean;
}

/**
 * Client wrapper that renders protected imagery.
 *
 * The genuine protection (signed URL, anti-hotlink, watermark) lives in
 * /api/asset. The handlers here are *UX deterrents only* — they stop casual
 * right-click/drag saving but cannot stop DevTools, screenshots, or curl.
 * We deliberately use a native <img>, not next/image, so the protected bytes
 * never get copied into the public /_next/image optimizer cache.
 */
export default function SecureImage({
  src,
  alt,
  className,
  priority = false,
  fill = false,
}: SecureImageProps) {
  return (
    <span
      className={cn("relative block", fill && "absolute inset-0 h-full w-full")}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          "select-none",
          fill ? "h-full w-full" : "block",
          className,
        )}
      />
      {/* Transparent overlay swallows long-press / drag-save on touch + desktop. */}
      <span
        aria-hidden
        className="pointer-events-auto absolute inset-0 z-10"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </span>
  );
}
