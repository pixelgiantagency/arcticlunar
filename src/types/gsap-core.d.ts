import type { gsap as gsapType } from "gsap";

declare global {
  const gsap: typeof gsapType;
}

export {};
