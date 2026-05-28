import type { Transition } from "framer-motion";

/** Physics constants tuned for the cinematic 2.5D feel. */
export const SPRING_SMOOTH: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
  mass: 0.6,
};

/** Loose, floaty spring for the hero object chasing the cursor (trails + sways). */
export const SPRING_FOLLOW: Transition = {
  type: "spring",
  stiffness: 45,
  damping: 12,
  mass: 1.1,
};

export const SPRING_MAGNETIC: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 15,
  mass: 0.1,
};

export const SPRING_DRAG: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 40,
};

/** Custom cubic-bezier for editorial reveals (expo-out). */
export const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as const;

export const REVEAL = {
  initial: { y: 30, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.8, ease: EASE_EXPO_OUT },
};
