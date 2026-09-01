// src/components/text-reveal.ts

/**
 * Wort-für-Wort Scroll-Reveal für Headings.
 * Setzt voraus, dass gsap, ScrollTrigger und SplitText bereits global
 * registriert sind (siehe initGsapCore() in main.ts) — hier wird nichts
 * erneut registriert.
 */

// Werte zum visuellen Feintuning – zentral hier, nicht verstreut im Code.
const TEXT_REVEAL_DEFAULTS = {
  scrollStart: 'top 90%', // ScrollTrigger-Start
  scrollEnd: 'center 40%', // ScrollTrigger-Ende
  fadedOpacity: 0.2, // Start-Opacity pro Wort
  stagger: 0.1, // Zeitversatz zwischen den Wörtern
} as const;

function readNumberAttr(el: HTMLElement, attr: string, fallback: number): number {
  const raw = el.getAttribute(attr);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function initTextReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-text-reveal]');
  if (!targets.length) return; // früh abbrechen, wenn die Seite keine Targets hat

  targets.forEach((heading) => {
    const scrollStart =
      heading.getAttribute('data-text-reveal-scroll-start') || TEXT_REVEAL_DEFAULTS.scrollStart;
    const scrollEnd =
      heading.getAttribute('data-text-reveal-scroll-end') || TEXT_REVEAL_DEFAULTS.scrollEnd;
    const fadedOpacity = readNumberAttr(
      heading,
      'data-text-reveal-fade',
      TEXT_REVEAL_DEFAULTS.fadedOpacity
    );
    const stagger = readNumberAttr(
      heading,
      'data-text-reveal-stagger',
      TEXT_REVEAL_DEFAULTS.stagger
    );

    new SplitText(heading, {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({
            scrollTrigger: {
              scrub: true,
              trigger: heading,
              start: scrollStart,
              end: scrollEnd,
            },
          });
          tl.from(self.words, {
            autoAlpha: fadedOpacity,
            stagger,
            ease: 'linear',
          });
        });
        return ctx; // GSAP räumt bei jedem Re-Split (Resize/Font-Load) sauber auf
      },
    });
  });
}
