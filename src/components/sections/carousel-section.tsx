"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import SecureImage from "@/components/ui/secure-image";
import { SPRING_DRAG, SPRING_SMOOTH } from "@/lib/motion-configs";

export interface CarouselItem {
  /** Signed URL minted server-side. */
  src: string;
  title: string;
  category: string;
}

interface MagneticCarouselProps {
  items: CarouselItem[];
  heading?: string;
  id?: string;
}

/**
 * Drag-to-explore carousel (no arrows). The track is draggable on X within
 * hardcoded, measured constraints, and each card tilts in 3D toward the cursor.
 */
export default function MagneticCarousel({
  items,
  heading = "Coleção",
  id = "colecao",
}: MagneticCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [constraint, setConstraint] = useState(0);

  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;
      // Negative max drag = how far left the track can travel.
      const overflow = track.scrollWidth - container.offsetWidth;
      setConstraint(overflow > 0 ? overflow : 0);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items.length]);

  return (
    <section id={id} className="relative w-full overflow-hidden bg-[var(--bg,#020617)] py-16 sm:py-24">
      <div ref={containerRef} className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6">
        <div className="mb-8 flex items-end justify-between sm:mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {heading}
          </h2>
          <span className="hidden text-sm uppercase tracking-widest text-slate-500 md:block">
            arraste para explorar
          </span>
        </div>

        <motion.div
          ref={trackRef}
          drag="x"
          dragConstraints={{ left: -constraint, right: 0 }}
          dragElastic={0.08}
          dragTransition={{ power: 0.2, timeConstant: 200 }}
          transition={SPRING_DRAG}
          className="flex cursor-grab gap-4 active:cursor-grabbing sm:gap-6"
        >
          {items.map((item, i) => (
            <TiltCard key={`${item.title}-${i}`} item={item} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TiltCard({ item }: { item: CarouselItem }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const srx = useSpring(rotateX, SPRING_SMOOTH);
  const sry = useSpring(rotateY, SPRING_SMOOTH);

  // Glare position follows the cursor for a subtle sheen.
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.18), transparent 55%)`,
  );

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const MAX_TILT = 12; // hardcoded clamp
    rotateY.set((px - 0.5) * 2 * MAX_TILT);
    rotateX.set((0.5 - py) * 2 * MAX_TILT);
    glareX.set(px * 100);
    glareY.set(py * 100);
  }

  function reset() {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }

  return (
    <motion.article
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      className="group relative aspect-[3/4] w-[260px] shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-[var(--surface,#0f172a)] sm:w-[300px] md:w-[340px]"
    >
      <SecureImage
        src={item.src}
        alt={item.title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{ background: glare }}
      />
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/90 to-transparent p-6">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent, #34d399)" }}>
          {item.category}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">{item.title}</h3>
      </div>
    </motion.article>
  );
}
