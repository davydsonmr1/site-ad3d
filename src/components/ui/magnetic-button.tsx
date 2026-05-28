"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { SPRING_MAGNETIC } from "@/lib/motion-configs";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  /** Max pixel displacement toward the cursor. */
  strength?: number;
  onClick?: () => void;
}

/**
 * CTA that drifts toward the cursor and springs back on leave.
 * Displacement is clamped by `strength`, so DOM tampering cannot fling it
 * across the layout.
 */
export default function MagneticButton({
  children,
  className,
  href,
  strength = 24,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING_MAGNETIC);
  const sy = useSpring(y, SPRING_MAGNETIC);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    const max = strength;
    x.set(Math.max(-max, Math.min(max, relX * 0.4)));
    y.set(Math.max(-max, Math.min(max, relY * 0.4)));
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  const classes = cn(
    "inline-flex items-center justify-center rounded-full px-8 py-4",
    "font-medium tracking-wide text-white transition-[filter]",
    "shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:brightness-110",
    className,
  );

  const Tag = href ? motion.a : motion.button;

  return (
    <Tag
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy, backgroundColor: "var(--accent, #10b981)" }}
      whileTap={{ scale: 0.96 }}
      className={classes}
    >
      {children}
    </Tag>
  );
}
