// src/global.ts

import Lenis from 'lenis';

let lenis: Lenis | undefined;

export function initGsapCore(): void {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  lenis = new Lenis({
    duration: 1, // grobes Äquivalent zu ScrollSmoothers smooth: 1
    smoothWheel: true,
    syncTouch: false, // = smoothTouch: false, Touch bleibt nativ
  });

  // Lenis meldet jeden Scroll-Frame an ScrollTrigger, damit Pin/Scrub etc. synchron bleiben.
  lenis.on('scroll', ScrollTrigger.update);

  // Lenis NICHT per eigenem rAF laufen lassen, sondern im GSAP-Ticker,
  // damit beide exakt denselben Frame-Takt nutzen (kein Ruckeln/Drift).
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000); // GSAP-Ticker liefert Sekunden, Lenis erwartet ms
  });
  gsap.ticker.lagSmoothing(0); // GSAPs eigenes Lag-Smoothing kollidiert sonst mit Lenis' RAF-Steuerung

  ScrollTrigger.refresh();
}

export function getLenis(): Lenis | undefined {
  return lenis;
}

export function initScrollRefreshFixes(): void {
  // lenis.resize() UND ScrollTrigger.refresh() müssen hier im Paar laufen:
  // ScrollTrigger.refresh() aktualisiert nur ScrollTriggers eigene
  // Trigger-/Pin-Positionen. Lenis führt eine komplett eigene, unabhängige
  // Messung der maximalen Scroll-Distanz (limit). Ändert sich die
  // Dokumenthöhe nach Lenis' Initialisierung (typischerweise durch
  // Web-Font-Tausch), bleibt Lenis' limit sonst auf dem alten, zu kleinen
  // Wert stehen - Mausrad-Scrollen (läuft über Lenis) wird dann VOR dem
  // echten Seitenende gekappt, obwohl ScrollTrigger selbst schon korrekt
  // aktualisiert ist. Nativer Scrollbar-Drag umgeht Lenis komplett und ist
  // deshalb davon nicht betroffen. Gleiches Pärchen wie in hero-intro.ts,
  // unlockScroll().
  window.addEventListener('load', () => {
    setTimeout(() => {
      getLenis()?.resize();
      ScrollTrigger.refresh();
    }, 100);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      getLenis()?.resize();
      ScrollTrigger.refresh();
    });
  }
}

export function revealAfterSetup(): void {
  document.body.classList.add('js-ready');
}
