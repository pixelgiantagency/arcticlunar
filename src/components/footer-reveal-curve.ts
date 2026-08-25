export function initFooterRevealCurve(): void {
  const footerTop = document.querySelector<HTMLElement>('[data-footer-top]');
  const footerBottom = document.querySelector<HTMLElement>('[data-footer-bottom]');
  const lip = document.querySelector<HTMLElement>('[data-footer-curve-lip]');
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
    },
  });
}
