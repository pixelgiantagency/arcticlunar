// src/global.ts

let smoother: ScrollSmoother | undefined;

export function initGsapCore(): void {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  smoother = ScrollSmoother.create({
    wrapper: '.page-wrapper',
    content: '.main-wrapper',
    smooth: 0.8,
    effects: true,
    smoothTouch: false,
  });
}

export function getSmoother(): ScrollSmoother | undefined {
  return smoother;
}

export function initScrollRefreshFixes(): void {
  window.addEventListener('load', () => {
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }
}

export function revealAfterSetup(): void {
  document.body.classList.add('js-ready');
}
