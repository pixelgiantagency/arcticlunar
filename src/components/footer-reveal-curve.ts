// src/components/footer-reveal-curve.ts

import { getLenis } from '../global';

const FOOTER_GRADIENT_CONFIG = {
  /** Opacity bei Scroll-Fortschritt 0. Der Maximalwert kommt nicht von hier,
   * sondern wird live aus der im Designer eingestellten Opacity des
   * Gradient-Elements gelesen (aktuell 13%). */
  minOpacity: 0,
  /** Debounce für den ResizeObserver-Refresh unten — verhindert mehrfache
   * ScrollTrigger.refresh()-Aufrufe hintereinander, wenn z.B. mehrere
   * Lazy-Load-Bilder kurz nacheinander laden und jeweils die Dokumenthöhe
   * ändern. */
  resizeRefreshDebounceMs: 150,
} as const;

export function initFooterRevealCurve(): void {
  const footerTop = document.querySelector<HTMLElement>('[data-footer-top]');
  const footerBottom = document.querySelector<HTMLElement>('[data-footer-bottom]');
  const lip = document.querySelector<HTMLElement>('[data-footer-curve-lip]');
  const gradient = document.querySelector<HTMLElement>('[data-footer-bottom-gradient]');
  if (!footerTop || !footerBottom || !lip) return; // früh abbrechen, wenn die Seite diese Elemente nicht hat

  gsap.registerPlugin(ScrollTrigger);
  lip.style.setProperty('--footer-curve-depth', '0px');

  // maxDepthPx kommt direkt aus der in Webflow gesetzten Höhe der Lippe -
  // keine zweite, manuell zu pflegende Konstante mehr. Wird bei Resize neu
  // gelesen, falls ihr per Breakpoint unterschiedliche Höhen setzt.
  let maxDepthPx = lip.offsetHeight;
  window.addEventListener('resize', () => {
    maxDepthPx = lip.offsetHeight;
  });

  // maxOpacity wird EINMALIG ausgelesen, bevor wir per Inline-Style
  // überschreiben - sonst würden wir bei einem zweiten Lesevorgang nur noch
  // unseren eigenen, bereits überschriebenen Wert zurückbekommen.
  const maxOpacity = gradient ? parseFloat(getComputedStyle(gradient).opacity) : 0;
  if (gradient) gradient.style.opacity = String(FOOTER_GRADIENT_CONFIG.minOpacity);

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: () => {
      const footerTopRect = footerTop.getBoundingClientRect();
      const footerBottomHeight = footerBottom.offsetHeight;

      // s = wie viele Pixel sich die Unterkante von footer_top bereits von
      // der Viewport-Unterkante zurückgezogen hat. 0 = allererstes Pixel
      // des footer_bottom-Reveals, footerBottomHeight = "kante an kante".
      const s = window.innerHeight - footerTopRect.bottom;
      const progress = Math.min(Math.max(s / footerBottomHeight, 0), 1);
      const depth = progress * maxDepthPx;

      gsap.set(lip, { '--footer-curve-depth': `${depth}px` });

      if (gradient) {
        const opacity =
          FOOTER_GRADIENT_CONFIG.minOpacity +
          progress * (maxOpacity - FOOTER_GRADIENT_CONFIG.minOpacity);
        gsap.set(gradient, { opacity });
      }
    },
  });

  // Body-Größenänderungen (Lazy-Load-Bilder, nachträglich geladene Fonts/
  // Components etc.) sollen ScrollTrigger neu vermessen lassen. WICHTIG:
  // lenis.resize() muss hier im selben Atemzug mitlaufen wie
  // ScrollTrigger.refresh() - sonst bleibt Lenis' eigene, unabhängige
  // Scroll-Limit-Berechnung veraltet, obwohl ScrollTrigger selbst schon
  // aktuell ist. Gleiches Prinzip wie in global.ts, initScrollRefreshFixes().
  let refreshTimeout: number | undefined;
  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(refreshTimeout);
    refreshTimeout = window.setTimeout(() => {
      getLenis()?.resize();
      ScrollTrigger.refresh();
    }, FOOTER_GRADIENT_CONFIG.resizeRefreshDebounceMs);
  });
  resizeObserver.observe(document.body);
}
