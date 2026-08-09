import type { SplitText as SplitTextType } from "gsap/SplitText";

declare global {
  const SplitText: typeof SplitTextType;
  type SplitText = InstanceType<typeof SplitTextType>;
}

export {};
