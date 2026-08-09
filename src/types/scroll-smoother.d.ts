import type { ScrollSmoother as ScrollSmootherType } from "gsap/ScrollSmoother";

declare global {
  const ScrollSmoother: typeof ScrollSmootherType;
  type ScrollSmoother = InstanceType<typeof ScrollSmootherType>;
}

export {};
