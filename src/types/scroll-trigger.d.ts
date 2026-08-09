import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

declare global {
  const ScrollTrigger: typeof ScrollTriggerType;
  type ScrollTrigger = InstanceType<typeof ScrollTriggerType>;
}

export {};
