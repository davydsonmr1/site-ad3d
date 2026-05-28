"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import SecureImage from "@/components/ui/secure-image";
import MagneticButton from "@/components/ui/magnetic-button";
import { EASE_EXPO_OUT, SPRING_FOLLOW } from "@/lib/motion-configs";

interface HeroParallaxProps {
  /** Signed URL for the blurred ambient background. */
  backgroundSrc: string;
  /** Signed URL for the cut-out foreground 3D piece (alpha PNG/WebP). */
  foregroundSrc: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * 2.5D hero with depth layers:
 *   - background (z-0): slow scroll drift + subtle scale
 *   - 3D object (z-10): sits behind the text and glides after the cursor
 *   - typography (z-20): medium scroll drift, fades out
 */
export default function HeroParallax({
  backgroundSrc,
  foregroundSrc,
  title = "AD3D.LAB",
  subtitle = "Transformando ideias em realidade através da precisão milimétrica.",
  ctaLabel = "Ver coleção",
  ctaHref = "#colecao",
}: HeroParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "120%"]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // The object follows the cursor: target = offset from center, eased by a
  // spring so it glides after the pointer. Clamped so it stays on-screen.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const fgX = useSpring(mx, SPRING_FOLLOW);
  const fgY = useSpring(my, SPRING_FOLLOW);

  function handleMouse(e: React.MouseEvent) {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const follow = 0.6; // how closely it chases the cursor
    const maxX = rect.width * 0.42;
    const maxY = rect.height * 0.42;
    mx.set(Math.max(-maxX, Math.min(maxX, dx * follow)));
    my.set(Math.max(-maxY, Math.min(maxY, dy * follow)));
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouse}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden bg-[var(--bg,#020617)]"
    >
      {/* Layer 1 — background ambience */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: reduced ? 0 : backgroundY, scale: reduced ? 1 : backgroundScale }}
      >
        <SecureImage
          src={backgroundSrc}
          alt="Ambiente do laboratório AD3D.LAB"
          fill
          priority
          className="object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950/60 to-slate-950" />
      </motion.div>

      {/* Layer 2 — typography + CTA */}
      <motion.div
        className="relative z-20 flex flex-col items-center px-4 text-center"
        style={{ y: reduced ? 0 : textY, opacity: reduced ? 1 : opacityFade }}
      >
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE_EXPO_OUT }}
          className="text-5xl font-extrabold tracking-tighter text-white drop-shadow-2xl sm:text-6xl md:text-8xl"
        >
          {title.includes(".") ? (
            <>
              {title.split(".")[0]}
              <span style={{ color: "var(--accent, #10b981)" }}>.</span>
              {title.split(".").slice(1).join(".")}
            </>
          ) : (
            title
          )}
        </motion.h1>
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE_EXPO_OUT }}
          className="mt-4 max-w-2xl text-base font-light tracking-wide text-slate-300 sm:text-xl md:text-2xl"
        >
          {subtitle}
        </motion.p>
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE_EXPO_OUT }}
          className="mt-10"
        >
          <MagneticButton href={ctaHref}>{ctaLabel}</MagneticButton>
        </motion.div>
      </motion.div>

      {/* 3D object — sits BEHIND the text (z-10) and follows the cursor */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        style={{ x: reduced ? 0 : fgX, y: reduced ? 0 : fgY }}
      >
        <div className="relative h-[40vh] max-h-[440px] w-[40vh] max-w-[440px] opacity-90">
          <SecureImage
            src={foregroundSrc}
            alt="Peça impressa em 3D pela AD3D.LAB"
            fill
            priority
            className="object-contain drop-shadow-[0_20px_60px_rgba(16,185,129,0.3)]"
          />
        </div>
      </motion.div>

      {/* Bottom blend into next section */}
      <div className="absolute bottom-0 z-40 h-32 w-full bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}
