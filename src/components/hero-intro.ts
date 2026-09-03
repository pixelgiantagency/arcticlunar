// src/components/hero-intro.ts

import { getLenis } from '../global';

/**
 * Page-Load-Intro: Die Hero-Headline wird zunächst groß und mittig getippt,
 * schrumpft danach an ihre eigentliche Position, und der restliche
 * Hero-Content (Dots-Hintergrund, Nav, Logo-Marquee, Subheadline, Button)
 * blendet danach gestaffelt ein.
 *
 * Läuft nur einmal pro Browser-Tab-Session (sessionStorage) und wird bei
 * prefers-reduced-motion übersprungen. gsap ist global verfügbar (CDN-Script,
 * siehe src/types/ .d.ts – analog zu hub-flow.ts, kein Import nötig).
 * ScrollTrigger ist ebenfalls global verfügbar (wird in global.ts per
 * gsap.registerPlugin(ScrollTrigger, ...) registriert).
 *
 * Zum Testen per URL-Parameter überschreibbar (kein Effekt auf echte
 * Besucher, da kein Standardpfad):
 *   ?hero-intro=play  → Animation läuft immer, ignoriert sessionStorage
 *                        und prefers-reduced-motion
 *   ?hero-intro=skip  → Animation wird immer übersprungen
 *
 * FOUC-Schutz für die Heading: hero-intro.css versteckt auch
 * [data-hero-intro-heading] dauerhaft per opacity:0; visibility:hidden,
 * bis JS sie explizit wieder sichtbar macht. Das ist bewusst so, obwohl
 * wir ihre natürliche Endposition/-größe per getBoundingClientRect()
 * messen müssen (siehe finalRect unten) — opacity/visibility beeinflussen
 * die Layout-Messung NICHT, ein unsichtbares Element hat trotzdem ganz
 * normal messbare Maße. Ohne dieses Hiding würde man kurz den vollen,
 * fertigen Heading-Text in Normalgröße/-position sehen, bevor JS
 * übernimmt (Race zwischen Bundle-Laden und Rendering). Die Heading wird
 * deshalb erst per autoAlpha:1 sichtbar gemacht, GENAU in dem Moment, in
 * dem sie schon in ihre große, mittige Intro-Position transformiert ist
 * (siehe gsap.set(heading, ...) unten) — so sieht man nie ihren
 * "Normalzustand" oder einen Sprung dorthin.
 *
 * Wichtig: Während des Tippens wird die Höhe der Heading per Inline-Style
 * auf die fertige Zwei-Zeilen-Höhe fixiert (siehe initHeroIntro). Ohne das
 * würde die wachsende Boxhöhe (1 Zeile → 2 Zeilen) dazu führen, dass jede
 * vertikale Zentrierung im Hero (egal ob Flex, Grid oder Transform-basiert)
 * live neu berechnet wird und Zeile 1 sichtbar nach oben wandert, sobald
 * Zeile 2 dazukommt.
 *
 * Tippgeschwindigkeit an MagicUIs TypingAnimation-Default angelehnt
 * (typeSpeed = duration default = 100ms/Zeichen). Drei bewusste,
 * dokumentierte Abweichungen von MagicUI:
 *   1. Stehzeit vor dem Schrumpfen (holdAfterTypeMs) — MagicUI kennt bei
 *      einem einzelnen, nicht-loopenden String keine Pause danach.
 *   2. Der Cursor bleibt während dieser Stehzeit sichtbar und blinkt
 *      weiter, statt sofort mit dem letzten Buchstaben zu verschwinden.
 *   3. Der Cursor ist ein per CSS gezeichnetes Rechteck, nicht MagicUIs
 *      literales "|"-Textzeichen (cursorStyle "line").
 *
 * Subheadline + Button + Logo-Marquee: Reveal-Bewegung 1:1 aus dem
 * projekteigenen data-reveal-group-Skript (content-reveal-scroll.js)
 * übernommen — Distanz, Duration, Ease sind exakt dessen Defaults für eine
 * Gruppe ohne data-Attribute. Einziger Unterschied: kein eigener
 * ScrollTrigger, da die Hero-Section beim Page-Load ohnehin sichtbar ist —
 * das Timing ist stattdessen direkt Teil dieser Timeline.
 *
 * Nav + Reveal-Elemente gemeinsam timen: Alle drei (Nav, Subheadline+Button-
 * Gruppe, Logo-Marquee) hängen an eigenen Labels, die relativ zu einem
 * gemeinsamen Anker "navReveal" positioniert werden. Dessen Position wird
 * per navStartOffset relativ zum bisher spätesten Endpunkt der Timeline
 * gesetzt (aktuell: Ende des Dots-Fades, also 0.3s davor = Default -0.3,
 * identisch zum bisherigen Nav-Timing).
 *   - revealStartOffset  → Subheadline+Button relativ zu "navReveal"
 *   - logosStartOffset   → Logo-Marquee relativ zu "navReveal"
 * Für beide gilt: 0 = exakt gleichzeitig mit Nav, negativ = davor,
 * positiv = danach. Beide sind unabhängig voneinander einstellbar.
 *
 * Scroll-Lock: Solange die Intro-Animation läuft, wird Scrollen verhindert
 * (siehe lockScroll/unlockScroll) — Lock direkt beim Animationsstart,
 * Unlock exakt im onComplete der Shrink-Animation, also in dem Moment, in
 * dem die Heading an ihrer Zielposition angekommen ist (nicht erst nach
 * Nav/Subheadline/Button/Logos). Zwei Ebenen, beide nötig:
 *   1. lenis.stop() / lenis.start() (aus src/global.ts, getLenis()) — hält
 *      Lenis' eigene Wheel-Smoothing-Verarbeitung an, die unabhängig vom
 *      nativen overflow läuft.
 *   2. overflow:hidden + touch-action:none auf html/body — laut global.ts
 *      läuft Lenis mit syncTouch:false, Touch-Scrollen bleibt also bewusst
 *      nativ und wird von lenis.stop() NICHT abgedeckt. Diese Ebene ist
 *      auf Mobile die eigentlich entscheidende.
 *
 * Refresh nach dem Unlock: global.ts löst über initScrollRefreshFixes()
 * ein ScrollTrigger.refresh() bei window "load" (+100ms) und bei
 * document.fonts.ready aus — beide können während der Intro-Sequenz feuern,
 * also während der Scroll-Lock (inkl. padding-right-Kompensation für die
 * versteckte Scrollbar) aktiv ist. unlockScroll() stößt deshalb nach
 * Wiederherstellung des normalen Layouts selbst ein lenis.resize() +
 * ScrollTrigger.refresh() an, damit auf Basis des jetzt korrekten Zustands
 * neu gemessen wird.
 *
 * Wichtig zu clearProps: hero-intro.css setzt Heading/Subheadline/Button/
 * Logo-Marquee/Dots/Nav dauerhaft auf opacity:0; visibility:hidden als
 * FOUC-Schutz, solange kein JS gelaufen ist. GSAPs autoAlpha überschreibt
 * das per Inline-Style, der per CSS-Spezifität immer gewinnt — ABER nur
 * solange dieser Inline-Style bestehen bleibt. clearProps: 'all' nach der
 * Reveal-Animation würde auch opacity/visibility wieder entfernen und
 * damit sofort wieder die CSS-Regel greifen lassen (Element verschwindet
 * augenblicklich nach dem Einblenden). Deshalb hier bewusst nur
 * clearProps: 'transform' — räumt den nicht mehr benötigten y-Transform
 * auf, lässt opacity/visibility aber als Inline-Style dauerhaft bestehen.
 */

const HERO_INTRO_CONFIG = {
  lines: ['Your Vision.', 'Our Engineering.'] as const, // fester Zeilenumbruch, siehe Design
  storageKey: 'hero-intro-played',
  typeSpeedMs: 100, // = MagicUI "duration" Default
  holdAfterTypeMs: 950, // Stehzeit NACH dem Tippen, Cursor blinkt hier weiter
  introScale: 1.2, // Skalierung der Headline im großen Intro-Zustand (Desktop)
  introScaleMobile: 1.1, // reduzierte Skalierung auf schmalen Viewports
  mobileBreakpoint: 480, // ab hier gilt introScaleMobile
  // Sicherheits-Deckel: die gewünschte Skalierung wird zusätzlich gekappt,
  // falls sie auf dem aktuellen Viewport sonst über den Rand hinausragen
  // würde. Verhindert Overflow auf jeder Bildschirmgröße, unabhängig davon,
  // wie introScale/introScaleMobile oben eingestellt sind.
  introMaxViewportWidthRatio: 0.85,
  introMaxViewportHeightRatio: 0.55,
  shrinkDuration: 1.1,
  shrinkEase: 'power3.inOut',
  dotsFadeDuration: 0.8,
  navSlideDuration: 0.6,
  navSlideFromY: -40, // px, Nav kommt von oben
  // Position des "navReveal"-Labels relativ zum bisher spätesten Endpunkt
  // der Timeline (siehe Datei-Kommentar oben) — bisheriges Nav-Timing.
  navStartOffset: -0.3,
  // Subheadline + Button + Logo-Marquee — siehe Datei-Kommentar oben, Werte
  // 1:1 aus content-reveal-scroll.js übernommen:
  revealDistance: '2em', // = data-distance Default im Reveal-Skript
  revealDuration: 0.8, // = animDuration im Reveal-Skript
  revealEase: 'power4.inOut', // = animEase im Reveal-Skript
  revealStaggerSec: 0.1, // = data-stagger Default (100ms) im Reveal-Skript (Subheadline → Button)
  // Startpunkte relativ zum "navReveal"-Label — siehe ausführliche
  // Erklärung im Datei-Kommentar oben. 0 = gleichzeitig mit Nav.
  revealStartOffset: 0, // Subheadline + Button
  logosStartOffset: 0, // Logo-Marquee
} as const;

type HeroIntroOverride = 'play' | 'skip' | null;

function getHeroIntroOverride(): HeroIntroOverride {
  const value = new URLSearchParams(window.location.search).get('hero-intro');
  return value === 'play' || value === 'skip' ? value : null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isExisting(el: HTMLElement | null): el is HTMLElement {
  return el !== null;
}

// Baut einen GSAP-Positions-String relativ zum bisherigen Ende der Timeline
// aus einem vorzeichenbehafteten Sekundenwert — negativ wird zu "-=x"
// (früher), positiv zu "+=x" (später), 0 zu "+=0" (exakt an dieser Stelle).
function toTimelineOffset(seconds: number): string {
  return seconds >= 0 ? `+=${seconds}` : `-=${Math.abs(seconds)}`;
}

// Wie toTimelineOffset, aber relativ zu einem benannten Label statt zum
// bisherigen Ende der Timeline — z.B. toLabelOffset('navReveal', 0.2)
// ergibt "navReveal+=0.2". Bei 0 wird das Label unverändert zurückgegeben
// (kein Offset-Suffix nötig, GSAP interpretiert das identisch).
function toLabelOffset(label: string, seconds: number): string {
  if (seconds === 0) return label;
  return `${label}${seconds > 0 ? '+=' : '-='}${Math.abs(seconds)}`;
}

// Verhindert Scrollen während der Intro-Animation — zwei Ebenen, siehe
// Datei-Kommentar oben: lenis.stop() für Lenis' Wheel-Smoothing, plus
// nativer overflow:hidden + touch-action:none-Lock (deckt u.a. Touch ab,
// das laut global.ts bewusst nicht von Lenis verarbeitet wird). Der
// native Teil kompensiert zusätzlich die Breite der verschwindenden
// Scrollbar per padding-right, damit der Content nicht seitlich springt.
// Vorherige Inline-Styles werden gemerkt und beim Unlock exakt
// wiederhergestellt (statt hart auf '' zurückzusetzen), falls anderswo im
// Projekt bereits Inline-Styles auf html/body gesetzt sein sollten.
let scrollLockPrevious: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlTouchAction: string;
} | null = null;

function lockScroll(): void {
  getLenis()?.stop();

  if (scrollLockPrevious) return; // nativer Teil bereits gesperrt, nicht doppelt merken

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  scrollLockPrevious = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPaddingRight: document.body.style.paddingRight,
    htmlTouchAction: document.documentElement.style.touchAction,
  };

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.touchAction = 'none';
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockScroll(): void {
  getLenis()?.start();

  if (!scrollLockPrevious) return;

  document.documentElement.style.overflow = scrollLockPrevious.htmlOverflow;
  document.body.style.overflow = scrollLockPrevious.bodyOverflow;
  document.body.style.paddingRight = scrollLockPrevious.bodyPaddingRight;
  document.documentElement.style.touchAction = scrollLockPrevious.htmlTouchAction;

  scrollLockPrevious = null;

  // Ein während des Locks gefeuertes ScrollTrigger.refresh() (siehe
  // initScrollRefreshFixes() in global.ts) kann veraltete Scroll-/Pin-
  // Dimensionen gecacht haben (z.B. für einen Footer-Curtain-Effekt) —
  // siehe ausführliche Erklärung im Datei-Kommentar oben. rAF, damit der
  // Browser die gerade wiederhergestellten Styles erst layoutet, bevor
  // neu gemessen wird.
  requestAnimationFrame(() => {
    getLenis()?.resize();
    ScrollTrigger.refresh();
  });
}

// Rendert die Zeilen statisch (fertig getippt), z.B. für den Skip-Fall
// bei reduced-motion oder Wiederholbesuch in derselben Session.
function renderStaticLines(heading: HTMLElement, lines: readonly string[]): void {
  heading.removeAttribute('aria-label');
  heading.innerHTML = '';
  lines.forEach((line) => {
    const lineEl = document.createElement('span');
    lineEl.className = 'hero-intro-line';
    lineEl.textContent = line;
    heading.append(lineEl);
  });
}

// Tippt die Zeilen nacheinander; der Cursor "springt" nach Zeile 1
// an den Anfang von Zeile 2, statt alles als einen Textblock zu tippen —
// so bleibt der Zeilenumbruch garantiert exakt wie im Design, unabhängig
// von der Viewport-Breite während des Intro-Zustands.
//
// Cursor ist ein leeres Element, das komplett über CSS (background-color +
// width/height) als Rechteck gezeichnet wird — siehe hero-intro.css.
// Bleibt nach dem letzten Buchstaben bewusst sichtbar und blinkt während
// der Stehzeit weiter — wird erst entfernt, wenn holdAfterTypeMs abgelaufen ist.
function typeInto(heading: HTMLElement, lines: readonly string[]): Promise<void> {
  return new Promise((resolve) => {
    heading.setAttribute('aria-label', lines.join(' '));
    heading.innerHTML = '';

    const cursor = document.createElement('span');
    cursor.className = 'hero-intro-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    const lineElements = lines.map(() => {
      const lineEl = document.createElement('span');
      lineEl.className = 'hero-intro-line';
      lineEl.setAttribute('aria-hidden', 'true');
      return lineEl;
    });
    lineElements.forEach((el) => heading.append(el));

    let lineIndex = 0;
    let charIndex = 0;

    function typeChar(): void {
      const chars = Array.from(lines[lineIndex]);
      const lineEl = lineElements[lineIndex];

      if (charIndex === 0) {
        lineEl.append(cursor); // Cursor an den Zeilenanfang setzen
      }

      if (charIndex < chars.length) {
        cursor.insertAdjacentText('beforebegin', chars[charIndex]);
        charIndex += 1;
        window.setTimeout(typeChar, HERO_INTRO_CONFIG.typeSpeedMs);
      } else if (lineIndex < lines.length - 1) {
        lineIndex += 1;
        charIndex = 0;
        window.setTimeout(typeChar, HERO_INTRO_CONFIG.typeSpeedMs);
      } else {
        window.setTimeout(() => {
          cursor.remove();
          resolve();
        }, HERO_INTRO_CONFIG.holdAfterTypeMs);
      }
    }

    typeChar();
  });
}

export function initHeroIntro(): void {
  const root = document.querySelector<HTMLElement>('[data-hero-intro]');
  if (!root) return;

  const heading = root.querySelector<HTMLElement>('[data-hero-intro-heading]');
  if (!heading) return;

  const dots = root.querySelector<HTMLElement>('[data-hero-intro-dots]');
  const subheadline = root.querySelector<HTMLElement>('[data-hero-intro-subheadline]');
  const button = root.querySelector<HTMLElement>('[data-hero-intro-button]');
  const logos = root.querySelector<HTMLElement>('[data-hero-intro-logos]');
  const nav = document.querySelector<HTMLElement>('[data-hero-intro-nav]');

  // Subheadline + Button + Logo-Marquee bekommen alle dieselbe Osmo-Fade-
  // Up-Bewegung (siehe Datei-Kommentar), starten aber ggf. zu eigenen
  // Zeitpunkten (siehe revealStartOffset / logosStartOffset weiter unten).
  const revealTargets = [subheadline, button].filter(isExisting);
  const logosTargets = [logos].filter(isExisting);
  const allIntroTargets = [dots, subheadline, button, logos, nav].filter(isExisting);

  const override = getHeroIntroOverride();

  let skipAnimation: boolean;
  if (override === 'play') {
    skipAnimation = false; // erzwingen, sessionStorage bewusst NICHT anfassen
  } else if (override === 'skip') {
    skipAnimation = true; // erzwingen, sessionStorage bewusst NICHT anfassen
  } else {
    const alreadyPlayed = sessionStorage.getItem(HERO_INTRO_CONFIG.storageKey) === 'true';
    skipAnimation = alreadyPlayed || prefersReducedMotion();
    sessionStorage.setItem(HERO_INTRO_CONFIG.storageKey, 'true');
  }

  if (skipAnimation) {
    renderStaticLines(heading, HERO_INTRO_CONFIG.lines);
    // Heading steht NICHT in allIntroTargets (die haben zusätzlich einen
    // y-Reset nötig, den die Heading nicht braucht) — eigener, expliziter
    // Reveal hier, siehe Datei-Kommentar oben zum FOUC-Schutz der Heading.
    gsap.set(heading, { autoAlpha: 1 });
    gsap.set(allIntroTargets, { autoAlpha: 1, y: 0 });
    return;
  }

  // Ab hier läuft die Animation garantiert — Scroll sofort sperren, nicht
  // erst nach fontsReady, damit auch die kurze Ladezeit bis dahin schon
  // abgedeckt ist.
  lockScroll();

  const fontsReady = document.fonts?.ready ?? Promise.resolve();

  fontsReady.then(() => {
    // getBoundingClientRect() funktioniert korrekt, obwohl die Heading via
    // CSS aktuell opacity:0/visibility:hidden ist — Layout-Maße bleiben
    // davon unberührt (siehe Datei-Kommentar oben zum FOUC-Schutz).
    const finalRect = heading.getBoundingClientRect();

    const desiredScale =
      window.innerWidth < HERO_INTRO_CONFIG.mobileBreakpoint
        ? HERO_INTRO_CONFIG.introScaleMobile
        : HERO_INTRO_CONFIG.introScale;
    const maxScaleByWidth =
      (window.innerWidth * HERO_INTRO_CONFIG.introMaxViewportWidthRatio) / finalRect.width;
    const maxScaleByHeight =
      (window.innerHeight * HERO_INTRO_CONFIG.introMaxViewportHeightRatio) / finalRect.height;
    const scale = Math.min(desiredScale, maxScaleByWidth, maxScaleByHeight);

    // Höhe fixieren, BEVOR das Tippen (und damit das Leeren/Neubefüllen von
    // innerHTML) beginnt — verhindert, dass die Box beim Tippen schrumpft/
    // wächst und dadurch von einer vertikalen Zentrierung im Hero neu
    // positioniert wird. Wert bewusst in ungeskalierten px (vor dem
    // transform:scale unten), da CSS height/transform unabhängig greifen.
    heading.style.height = `${finalRect.height}px`;

    const elCenterX = finalRect.left + finalRect.width / 2;
    const elCenterY = finalRect.top + finalRect.height / 2;
    const deltaX = window.innerWidth / 2 - elCenterX;
    const deltaY = window.innerHeight / 2 - elCenterY;

    gsap.set(heading, {
      transformOrigin: 'center center',
      x: deltaX,
      y: deltaY,
      scale,
      // Erst HIER sichtbar machen — genau in dem Moment, in dem die
      // Heading schon in ihre große, mittige Intro-Position transformiert
      // ist. So sieht man nie ihren normalen End-Zustand oder einen
      // Sprung dorthin (siehe Datei-Kommentar oben).
      autoAlpha: 1,
    });
    if (dots) gsap.set(dots, { autoAlpha: 0 });
    gsap.set([...revealTargets, ...logosTargets], {
      autoAlpha: 0,
      y: HERO_INTRO_CONFIG.revealDistance,
    });
    if (nav) gsap.set(nav, { autoAlpha: 0, y: HERO_INTRO_CONFIG.navSlideFromY });

    typeInto(heading, HERO_INTRO_CONFIG.lines).then(() => {
      const tl = gsap.timeline();

      tl.to(heading, {
        x: 0,
        y: 0,
        scale: 1,
        duration: HERO_INTRO_CONFIG.shrinkDuration,
        ease: HERO_INTRO_CONFIG.shrinkEase,
        onComplete: () => {
          // Fixierte Höhe wieder freigeben, damit die Heading an ihrer
          // finalen Position wieder normal responsiv (auto-Höhe) bleibt.
          heading.style.height = '';
          // Heading ist jetzt am Ziel angekommen — Scroll wieder freigeben
          // (inkl. ScrollTrigger/Lenis-Refresh, siehe Datei-Kommentar oben).
          unlockScroll();
        },
      });

      if (dots) {
        tl.to(dots, { autoAlpha: 1, duration: HERO_INTRO_CONFIG.dotsFadeDuration }, '-=0.2');
      }

      // Nav + Reveal-Elemente hängen alle relativ am selben Anker-Label —
      // siehe ausführliche Erklärung im Datei-Kommentar oben.
      tl.addLabel('navReveal', toTimelineOffset(HERO_INTRO_CONFIG.navStartOffset));

      if (nav) {
        tl.to(
          nav,
          { autoAlpha: 1, y: 0, duration: HERO_INTRO_CONFIG.navSlideDuration },
          'navReveal'
        );
      }

      // Subheadline + Button: Reveal-Gruppe nach Osmo-Muster (siehe
      // Datei-Kommentar oben) — Subheadline zuerst, Button revealStaggerSec
      // später, beide mit demselben Fade-Up-Movement.
      tl.addLabel('contentReveal', toLabelOffset('navReveal', HERO_INTRO_CONFIG.revealStartOffset));

      if (subheadline) {
        tl.to(
          subheadline,
          {
            y: 0,
            autoAlpha: 1,
            duration: HERO_INTRO_CONFIG.revealDuration,
            ease: HERO_INTRO_CONFIG.revealEase,
            // Nur transform aufräumen, NICHT 'all' — siehe Datei-Kommentar
            // oben zu clearProps und dem FOUC-Schutz in hero-intro.css.
            onComplete: () => gsap.set(subheadline, { clearProps: 'transform' }),
          },
          'contentReveal'
        );
      }
      if (button) {
        tl.to(
          button,
          {
            y: 0,
            autoAlpha: 1,
            duration: HERO_INTRO_CONFIG.revealDuration,
            ease: HERO_INTRO_CONFIG.revealEase,
            // Nur transform aufräumen, NICHT 'all' — siehe Datei-Kommentar
            // oben zu clearProps und dem FOUC-Schutz in hero-intro.css.
            onComplete: () => gsap.set(button, { clearProps: 'transform' }),
          },
          `contentReveal+=${HERO_INTRO_CONFIG.revealStaggerSec}`
        );
      }

      // Logo-Marquee: eigenes Label, eigener Startpunkt relativ zu
      // "navReveal" (logosStartOffset) — unabhängig von revealStartOffset
      // einstellbar, siehe Datei-Kommentar oben.
      if (logos) {
        tl.addLabel('logosReveal', toLabelOffset('navReveal', HERO_INTRO_CONFIG.logosStartOffset));
        tl.to(
          logos,
          {
            y: 0,
            autoAlpha: 1,
            duration: HERO_INTRO_CONFIG.revealDuration,
            ease: HERO_INTRO_CONFIG.revealEase,
            // Nur transform aufräumen, NICHT 'all' — siehe Datei-Kommentar
            // oben zu clearProps und dem FOUC-Schutz in hero-intro.css.
            onComplete: () => gsap.set(logos, { clearProps: 'transform' }),
          },
          'logosReveal'
        );
      }
    });
  });
}
