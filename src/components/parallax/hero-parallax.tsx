"use client";

import { useEffect, useRef } from "react";
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
import { clamp } from "@/lib/utils";

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
 *   - typography (z-20): sits lower on the screen, scroll drift + fade
 *   - 3D object (z-30): floats above the text and glides after the pointer.
 *     On touch devices it follows the finger; shaking the phone nudges it.
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

  // The object chases the pointer (mouse or finger); a loose spring makes it
  // glide. Clamped to a fraction of the hero so it never leaves the screen.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const fgX = useSpring(mx, SPRING_FOLLOW);
  const fgY = useSpring(my, SPRING_FOLLOW);

  function moveTo(clientX: number, clientY: number) {
    if (reduced) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const follow = 0.6;
    mx.set(clamp(dx * follow, -rect.width * 0.42, rect.width * 0.42));
    my.set(clamp(dy * follow, -rect.height * 0.42, rect.height * 0.42));
  }

  function recenter() {
    mx.set(0);
    my.set(0);
  }

  // iOS requires an explicit permission (from a user gesture) before it emits
  // devicemotion events. Request it on the first touch.
  function enableMotion() {
    const DM = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DM && typeof DM.requestPermission === "function") {
      DM.requestPermission().catch(() => {});
    }
  }

  // Shake-to-jiggle: a sharp change in acceleration flings the object to a
  // random spot, then it springs back.
  useEffect(() => {
    if (reduced || typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      return;
    }
    let last: { x: number; y: number; z: number } | null = null;
    let lastT = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const now = Date.now();
      if (now - lastT < 80) return;
      lastT = now;
      if (last) {
        const delta =
          Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z);
        if (delta > 22) {
          const el = containerRef.current;
          const w = (el?.offsetWidth ?? window.innerWidth) * 0.32;
          const h = (el?.offsetHeight ?? window.innerHeight) * 0.32;
          mx.set((Math.random() * 2 - 1) * w);
          my.set((Math.random() * 2 - 1) * h);
          if (timer) clearTimeout(timer);
          timer = setTimeout(recenter, 380);
        }
      }
      last = { x: a.x, y: a.y, z: a.z };
    };

    window.addEventListener("devicemotion", onMotion);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      if (timer) clearTimeout(timer);
    };
    // mx/my are stable refs from useMotionValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <section
      ref={containerRef}
      onMouseMove={(e) => moveTo(e.clientX, e.clientY)}
      onMouseLeave={recenter}
      onTouchStart={enableMotion}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) moveTo(t.clientX, t.clientY);
      }}
      className="relative flex h-[100svh] w-full flex-col items-center justify-start overflow-hidden bg-[var(--bg,#020617)] pt-[36vh] sm:pt-[38vh]"
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

      {/* Layer 2 — typography + CTA (lower on screen) */}
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

      {/* 3D object — floats ABOVE the text (z-30) and follows the pointer */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-[3vh] z-30 flex justify-center"
        style={{ x: reduced ? 0 : fgX, y: reduced ? 0 : fgY }}
      >
        <div className="relative h-[38vh] max-h-[420px] w-[38vh] max-w-[420px]">
          <SecureImage
            src={foregroundSrc}
            alt="Peça impressa em 3D pela AD3D.LAB"
            fill
            priority
            className="object-contain drop-shadow-[0_20px_60px_rgba(16,185,129,0.35)]"
          />
        </div>
      </motion.div>

      {/* Bottom blend into next section */}
      <div className="absolute bottom-0 z-40 h-32 w-full bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}
