// src/components/logo-marquee.ts

// Tunable Werte an einer Stelle, statt im Code verstreut.
const CONFIG = {
  defaultDuration: 30, // Sekunden, falls data-marquee-duration fehlt oder ungültig ist
  resizeDebounceMs: 200, // Wartezeit nach Resize-Ende, bevor neu berechnet wird
};

const CLONE_ATTR = 'data-marquee-clone';

export function initLogoMarquee(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((instance) => {
    if (instance.dataset.marqueeInit === 'true') return;

    const track = instance.querySelector<HTMLElement>('[data-marquee-track]');
    const group = instance.querySelector<HTMLElement>('[data-marquee-group]');
    if (!track || !group) return;

    // TypeScript does not carry the null-check narrowing above into the
    // nested function declarations below (buildClones, startTween etc.),
    // so capture definitely-non-null references here instead of sprinkling
    // `!` assertions at every usage site further down.
    const trackEl: HTMLElement = track;
    const groupEl: HTMLElement = group;

    const duration =
      parseFloat(instance.getAttribute('data-marquee-duration') || '') || CONFIG.defaultDuration;
    const direction: 'left' | 'right' =
      instance.getAttribute('data-marquee-direction') === 'right' ? 'right' : 'left';

    // IMPORTANT: all of this must be declared/defined before the image-loading
    // gate below, because setup() can run SYNCHRONOUSLY (if images are already
    // cached, img.complete is true immediately) — referencing `clones`/`tween`
    // before their `let`/`const` declarations execute throws a ReferenceError
    // ("Cannot access '...' before initialization") and silently aborts init.
    let tween: ReturnType<typeof gsap.to> | undefined;
    const clones: HTMLElement[] = [];
    let beforeWidth = 0; // total width (incl. gaps) of the groups cloned BEFORE the original
    let period = 0; // true repeat distance: group width + the gap between groups

    function clearClones(): void {
      clones.forEach((c) => c.remove());
      clones.length = 0;
      beforeWidth = 0;
      period = 0;
    }

    // Clones are added on BOTH sides of the original group. That way the
    // marquee works correctly whichever direction it scrolls, without
    // needing separate logic per direction.
    //
    // The repeat distance ("period") is measured from actual clone
    // positions rather than just the group's own width, because any gap
    // the track applies between groups (so seams don't look glued
    // together) is NOT part of the group's own box width.
    function buildClones(): void {
      clearClones();
      const instanceWidth = instance.getBoundingClientRect().width;
      const initialWidth = groupEl.getBoundingClientRect().width;
      if (!initialWidth || !instanceWidth) return;

      const firstClone = groupEl.cloneNode(true) as HTMLElement;
      firstClone.setAttribute(CLONE_ATTR, '');
      firstClone.setAttribute('aria-hidden', 'true');
      trackEl.appendChild(firstClone);
      clones.push(firstClone);

      period = firstClone.getBoundingClientRect().left - groupEl.getBoundingClientRect().left;
      if (!period) period = initialWidth;

      const needed = instanceWidth + period;

      let widthAfter = period; // firstClone already accounted for
      while (widthAfter < needed) {
        const clone = groupEl.cloneNode(true) as HTMLElement;
        clone.setAttribute(CLONE_ATTR, '');
        clone.setAttribute('aria-hidden', 'true');
        trackEl.appendChild(clone);
        clones.push(clone);
        widthAfter += period;
      }

      let widthBefore = 0;
      while (widthBefore < needed) {
        const clone = groupEl.cloneNode(true) as HTMLElement;
        clone.setAttribute(CLONE_ATTR, '');
        clone.setAttribute('aria-hidden', 'true');
        trackEl.insertBefore(clone, trackEl.firstChild);
        clones.push(clone);
        widthBefore += period;
      }
      beforeWidth = widthBefore; // always an exact multiple of period
    }

    function startTween(): void {
      if (!period) return;

      if (tween) tween.kill();

      // "right" needs to start shifted left by exactly the width of the
      // groups cloned in front of the original one, so that as the track
      // moves right, that pre-cloned content has somewhere to come from.
      // Without this, the track has nothing at negative local coordinates
      // and the content just runs out to the right with nothing following.
      const startX = direction === 'right' ? -beforeWidth : 0;
      const endX = direction === 'right' ? startX + period : -period;

      gsap.set(trackEl, { x: startX });

      if (reduceMotion) return; // stays static, respects user preference

      tween = gsap.to(trackEl, {
        x: endX,
        duration,
        ease: 'none',
        repeat: -1,
      });
    }

    // Rebuilds clones + restarts the loop with the current widths.
    // Called once on init and again (debounced) on every resize.
    function recompute(): void {
      buildClones();
      startTween();
    }

    function setup(): void {
      recompute();
      instance.dataset.marqueeInit = 'true';

      let resizeTimer: ReturnType<typeof setTimeout> | undefined;
      let lastWidth = instance.getBoundingClientRect().width;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const newWidth = instance.getBoundingClientRect().width;
          if (Math.abs(newWidth - lastWidth) > 1) {
            lastWidth = newWidth;
            recompute();
          }
        }, CONFIG.resizeDebounceMs);
      });
    }

    // Wait for images before measuring widths — but everything setup() needs
    // is already declared above, so it's safe whether this resolves
    // synchronously (cached images) or asynchronously (fresh load).
    const images = Array.from(groupEl.querySelectorAll('img'));
    if (images.length === 0) {
      setup();
    } else {
      let loaded = 0;
      const onLoad = (): void => {
        loaded += 1;
        if (loaded === images.length) setup();
      };
      images.forEach((img) => {
        if (img.complete) onLoad();
        else {
          img.addEventListener('load', onLoad, { once: true });
          img.addEventListener('error', onLoad, { once: true });
        }
      });
    }
  });
}
