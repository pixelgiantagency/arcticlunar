// src/components/code-showcase.ts
//
// Voraussetzung: gsap ist global verfügbar (CDN-Script-Tag im Webflow
// Head-Snippet, .d.ts liegt in src/types/ – siehe Konventionen).

interface CodeToken {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'function' | 'plain' | 'punct';
}

// Welcher Wireframe-Bereich rechts "gecoded" wird, wenn diese Zeile
// fertig ist. Sitzt an der Zeile, nicht am Token.
type WireframeCue = 'statGroup' | 'chartBox' | 'table';

interface CodeLine {
  tokens: CodeToken[];
  // 'pop' (Default): Zeile ploppt komplett rein statt Zeichen für
  // Zeichen. 'type': echter Zeichen-für-Zeichen-Typewriter. Regel: pro
  // Code-Block ist das öffnende UND das schließende Tag 'type', alles
  // dazwischen (Props, Inhalte) ist 'pop'.
  mode?: 'pop' | 'type';
  cue?: WireframeCue;
  // Markiert den Übergang von reinem Boilerplate zum UI-relevanten Teil
  // – daran hängen initCodeShowcase() die Sidebar-Icons.
  boundary?: boolean;
}

// Ab welchem Sichtbarkeits-Anteil (0–1) die Animation zum ersten Mal
// startet.
const IN_VIEW_THRESHOLD = 0.3;

// Timings & Physik-Konstanten – hier live dran drehen.
const TIMING = {
  entranceDuration: 0.7, // einmaliges Einfliegen von IDE- und Browser-Fenster
  entranceStagger: 0.15,
  // Wie viel früher der Content-Teil (Icons, Code, alles danach) beginnt,
  // relativ zum Ende der Fenster-Entrance – überlappt bewusst, damit sich
  // NUR "wann beginnt der Inhalt" verschiebt, nicht die Fenster-Optik
  // selbst. 0 = wartet bis Fenster komplett fertig eingeflogen sind.
  contentStartOverlap: 0.2,
  navIconStagger: 0.08,
  statCardStagger: 0.14, // Abstand zwischen den 3 Stat-Cards, wenn sie als Gruppe reinpoppen
  popDuration: 0.45, // Dauer eines einzelnen Kachel-Pop-ins
  popEase: 'back.out(1.7)',
  popGroupGap: 0.25, // Pause zwischen "Zeile fertig" und Pop-in – das "Beat"-Gefühl
  barRevealDuration: 0.35,
  barRevealStagger: 0.05,

  // Zeichen-für-Zeichen-Typewriter (nur mode: 'type')
  typewriterCharDelay: 0.032, // Basis-Sekunden pro Zeichen
  charJitterMin: 0.55, // Geschwindigkeits-Schwankung pro Token, min
  charJitterMax: 1.6, // ...max – bewusst breit, wirkt weniger maschinell
  tokenPauseChance: 0.24, // Chance auf eine kleine Zusatz-Pause nach einem Token
  tokenPauseDuration: 0.14,
  longPauseChance: 0.09, // seltene, deutlich längere "Nachdenk"-Pause
  longPauseDurationMin: 0.35,
  longPauseDurationMax: 0.65,
  lineDelay: 0.16, // Pause zwischen zwei getippten Zeilen

  // Zeilen-Pop (mode: 'pop' bzw. Default)
  popLineDurationMin: 0.06,
  popLineDurationMax: 0.15,
  popLineDelayMin: 0.04,
  popLineDelayMax: 0.2,
  popBlankPause: 0.1,
  groupPauseDelay: 0.65, // Pause bei Leerzeilen im relevanten Teil

  chartLineDuration: 0.9,
  loopPause: 1.4, // Pause zwischen zwei kompletten Loop-Durchläufen
} as const;

// Code-Inhalt fürs IDE-Fenster. Bewusst als Daten gepflegt statt in
// Webflow getippt (siehe animation-component-conventions.md). Boilerplate
// (Imports, Function-Shell) bewusst kurz gehalten, damit es schnell zum
// UI-relevanten Teil kommt. Pro Code-Block (StatCard/Chart/DataTable,
// section, div) ist das öffnende und schließende Tag 'type', der Inhalt
// dazwischen 'pop'.
const CODE_LINES: CodeLine[] = [
  {
    tokens: [
      { text: 'import ', type: 'keyword' },
      { text: '{ useEffect, useState } ', type: 'plain' },
      { text: 'from ', type: 'keyword' },
      { text: "'react'", type: 'string' },
      { text: ';', type: 'punct' },
    ],
  },
  {
    tokens: [
      { text: 'import ', type: 'keyword' },
      { text: '{ StatCard, Chart, DataTable } ', type: 'plain' },
      { text: 'from ', type: 'keyword' },
      { text: "'@/ui'", type: 'string' },
      { text: ';', type: 'punct' },
    ],
  },
  {
    tokens: [
      { text: 'import ', type: 'keyword' },
      { text: '{ useDashboardData } ', type: 'plain' },
      { text: 'from ', type: 'keyword' },
      { text: "'@/hooks/useDashboardData'", type: 'string' },
      { text: ';', type: 'punct' },
    ],
  },
  { tokens: [] },
  {
    tokens: [
      { text: 'export ', type: 'keyword' },
      { text: 'function ', type: 'keyword' },
      { text: 'Dashboard()', type: 'function' },
      { text: ' {', type: 'plain' },
    ],
  },
  {
    tokens: [
      { text: '  return ', type: 'keyword' },
      { text: '(', type: 'plain' },
    ],
  },
  {
    mode: 'type',
    boundary: true,
    tokens: [
      { text: '    <div ', type: 'plain' },
      { text: 'className=', type: 'plain' },
      { text: '"dashboard"', type: 'string' },
      { text: '>', type: 'plain' },
    ],
  },
  {
    mode: 'type',
    tokens: [
      { text: '      <section ', type: 'plain' },
      { text: 'className=', type: 'plain' },
      { text: '"dashboard__stats"', type: 'string' },
      { text: '>', type: 'plain' },
    ],
  },
  { tokens: [{ text: '        <StatCard', type: 'function' }] },
  {
    tokens: [
      { text: '          label=', type: 'plain' },
      { text: '"Revenue"', type: 'string' },
    ],
  },
  {
    tokens: [
      { text: '          value=', type: 'plain' },
      { text: '"$12.4k"', type: 'string' },
    ],
  },
  { cue: 'statGroup', tokens: [{ text: '        />', type: 'function' }] },
  {
    tokens: [
      { text: '        <StatCard ', type: 'function' },
      { text: 'label=', type: 'plain' },
      { text: '"Users" ', type: 'string' },
      { text: 'value=', type: 'plain' },
      { text: '"1,204" ', type: 'string' },
      { text: '/>', type: 'plain' },
    ],
  },
  {
    tokens: [
      { text: '        <StatCard ', type: 'function' },
      { text: 'label=', type: 'plain' },
      { text: '"Growth" ', type: 'string' },
      { text: 'value=', type: 'plain' },
      { text: '"+18%" ', type: 'string' },
      { text: '/>', type: 'plain' },
    ],
  },
  { tokens: [{ text: '      </section>', type: 'plain' }] },
  { tokens: [] },
  {
    cue: 'chartBox',
    tokens: [
      { text: '      <section ', type: 'plain' },
      { text: 'className=', type: 'plain' },
      { text: '"dashboard__chart"', type: 'string' },
      { text: '>', type: 'plain' },
    ],
  },
  { mode: 'type', tokens: [{ text: '        <Chart', type: 'function' }] },
  { tokens: [{ text: '          data={weeklyStats}', type: 'plain' }] },
  { mode: 'type', tokens: [{ text: '        />', type: 'function' }] },
  { tokens: [{ text: '      </section>', type: 'plain' }] },
  { tokens: [] },
  {
    tokens: [
      { text: '      <section ', type: 'plain' },
      { text: 'className=', type: 'plain' },
      { text: '"dashboard__table"', type: 'string' },
      { text: '>', type: 'plain' },
    ],
  },
  { mode: 'type', tokens: [{ text: '        <DataTable', type: 'function' }] },
  { tokens: [{ text: '          rows={recentOrders}', type: 'plain' }] },
  { mode: 'type', cue: 'table', tokens: [{ text: '        />', type: 'function' }] },
  { mode: 'type', tokens: [{ text: '      </section>', type: 'plain' }] },
  { mode: 'type', tokens: [{ text: '    </div>', type: 'plain' }] },
  { tokens: [{ text: '  );', type: 'plain' }] },
  { tokens: [{ text: '}', type: 'plain' }] },
];

// Läuft durch alle overflow:hidden-Vorfahren hoch und berechnet die
// tatsächlich sichtbare Fläche als Schnittmenge – falls mehrere
// verschachtelte Boxen clippen, reicht es nicht, nur die eigene Box zu
// betrachten.
function getVisibleClipRect(el: HTMLElement): DOMRect {
  let rect = el.getBoundingClientRect();
  let parent = el.parentElement;

  while (parent) {
    const style = getComputedStyle(parent);
    if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
      const parentRect = parent.getBoundingClientRect();
      const top = Math.max(rect.top, parentRect.top);
      const bottom = Math.min(rect.bottom, parentRect.bottom);
      const left = Math.max(rect.left, parentRect.left);
      const right = Math.min(rect.right, parentRect.right);
      rect = new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
    }
    parent = parent.parentElement;
  }

  return rect;
}

function renderTokens(container: HTMLElement, tokens: CodeToken[]): void {
  tokens.forEach((token) => {
    const span = document.createElement('span');
    span.className = `code-showcase_token code-showcase_token-${token.type}`;
    span.textContent = token.text;
    container.appendChild(span);
  });
}

// Baut die Zeilen-Elemente einmalig auf (persistieren über alle Loops)
// und gibt eine Timeline zurück, plus die Zeitpunkte für die Cues und
// den Übergang zum relevanten Teil (daran hängt initCodeShowcase() die
// Sidebar-Icons und die Kachel-Pop-ins).
function buildTypewriter(linesContainer: HTMLElement): {
  timeline: gsap.core.Timeline;
  cueTimes: Partial<Record<WireframeCue, number>>;
  navIconsTime: number;
} {
  linesContainer.innerHTML = '';
  const tl = gsap.timeline();
  const cueTimes: Partial<Record<WireframeCue, number>> = {};
  let navIconsTime = 0;

  // Track: alle Zeilen landen hier drin, statt direkt im (sichtbaren,
  // overflow:hidden) Viewport – so kann der Track per translateY nach
  // oben geschoben werden, sobald der Code die sichtbare Höhe sprengt.
  const track = document.createElement('div');
  track.className = 'code-showcase_ide-lines-track';
  linesContainer.appendChild(track);

  // EIN einziger, persistenter Cursor für die ganze Sequenz.
  const cursor = document.createElement('span');
  cursor.className = 'code-showcase_cursor';
  gsap.set(cursor, { display: 'none' });
  track.appendChild(cursor);

  tl.set(track, { y: 0 }); // Scroll-Position bei jedem Loop-Start zurücksetzen

  // Erst ALLE Zeilen-Elemente (noch leer) anlegen, um mit echten
  // gerenderten Positionen zu messen statt mit geschätzter Zeilenhöhe.
  const lineEls = CODE_LINES.map(() => {
    const el = document.createElement('div');
    el.className = 'code-showcase_line';
    const content = document.createElement('span');
    content.className = 'code-showcase_line-content';
    el.appendChild(content);
    track.appendChild(el);
    return { el, content };
  });

  const viewportRect = getVisibleClipRect(linesContainer);
  const trackRect = track.getBoundingClientRect();
  const trackOffset = trackRect.top - viewportRect.top; // echter Abstand Fenster-Oberkante -> Track-Oberkante
  // Kleiner Sicherheitsabstand: bei so kleiner Schriftgröße kann eine
  // Zeichen-Glyphe minimal über die rechnerische Line-Height-Box
  // hinausragen – das lässt sich aus dem Boxmodell nicht exakt
  // vorhersagen, daher lieber etwas Luft an der Unterkante lassen.
  const SAFETY_MARGIN_PX = 4;
  const usableHeight = viewportRect.height - SAFETY_MARGIN_PX;

  CODE_LINES.forEach((line, index) => {
    const { el: lineEl, content } = lineEls[index];
    const usePop = line.mode !== 'type';

    // Nur die Unterkante zählt: die aktuelle Zeile rutscht exakt bündig
    // an den unteren Rand, egal ob dadurch oben eine Zeile angeschnitten
    // wird. Direkte 1:1-Messung, keine Schätzung, kein Runden.
    const lineBottom = trackOffset + lineEl.offsetTop + lineEl.offsetHeight;
    if (lineBottom > usableHeight) {
      tl.to(track, { y: -(lineBottom - usableHeight), duration: 0.35, ease: 'power2.out' });
    }

    if (line.tokens.length === 0) {
      tl.to({}, { duration: usePop ? TIMING.popBlankPause : TIMING.groupPauseDelay });
      if (line.boundary) navIconsTime = tl.duration();
      return;
    }

    const tokenEls = line.tokens.map((token) => {
      const span = document.createElement('span');
      span.className = `code-showcase_token code-showcase_token-${token.type}`;
      span.textContent = token.text;
      content.appendChild(span);
      return span;
    });

    const targetWidth = content.scrollWidth;
    gsap.set(content, { width: 0 }); // verhindert Aufblitzen der vollen Zeile beim Laden

    tl.set(content, { width: 0 });
    tl.call(() => lineEl.appendChild(cursor));
    tl.set(cursor, { x: 0, display: 'inline-block' });

    if (usePop) {
      // Inhalt eines Blocks (Props etc.): Zeile ploppt komplett rein
      // statt Zeichen für Zeichen, Dauer UND Delay leicht unterschiedlich
      // pro Zeile, damit es nicht mechanisch wirkt.
      const popDuration =
        TIMING.popLineDurationMin +
        Math.random() * (TIMING.popLineDurationMax - TIMING.popLineDurationMin);
      tl.to(content, { width: targetWidth, duration: popDuration, ease: 'power1.out' });
      tl.set(cursor, { x: targetWidth });
      const gap =
        TIMING.popLineDelayMin + Math.random() * (TIMING.popLineDelayMax - TIMING.popLineDelayMin);
      tl.to({}, { duration: gap });
    } else {
      // Öffnendes/schließendes Tag eines Blocks: echter
      // Zeichen-für-Zeichen-Typewriter.
      let cumulativeWidth = 0;
      tokenEls.forEach((span, tokenIndex) => {
        const tokenWidth = span.offsetWidth;
        const fromWidth = cumulativeWidth;
        cumulativeWidth += tokenWidth;
        const charCount = line.tokens[tokenIndex].text.length;

        const jitter =
          TIMING.charJitterMin + Math.random() * (TIMING.charJitterMax - TIMING.charJitterMin);
        const duration = Math.max(charCount, 1) * TIMING.typewriterCharDelay * jitter;

        const proxy = { w: fromWidth };
        tl.to(proxy, {
          w: cumulativeWidth,
          duration,
          ease: 'none',
          onUpdate: () => {
            content.style.width = `${proxy.w}px`;
            cursor.style.transform = `translateX(${proxy.w}px)`;
          },
        });

        // Entweder eine seltene, deutlich längere "Nachdenk"-Pause, oder
        // (häufiger) eine kleine Mikro-Pause, oder gar keine – erzeugt
        // ein unregelmäßiges, menschlicheres Tipp-Muster.
        if (Math.random() < TIMING.longPauseChance) {
          const pause =
            TIMING.longPauseDurationMin +
            Math.random() * (TIMING.longPauseDurationMax - TIMING.longPauseDurationMin);
          tl.to({}, { duration: pause });
        } else if (Math.random() < TIMING.tokenPauseChance) {
          tl.to({}, { duration: TIMING.tokenPauseDuration });
        }
      });

      tl.to({}, { duration: TIMING.lineDelay });
    }

    // Cue-Erfassung gilt für BEIDE Modi (pop und type) – nicht nur für
    // getippte Zeilen, sonst bleibt ein Cue bei 0 hängen und die
    // zugehörige Kachel poppt viel zu früh.
    if (line.cue) {
      cueTimes[line.cue] = tl.duration();
    }

    if (line.boundary) navIconsTime = tl.duration();
  });

  return { timeline: tl, cueTimes, navIconsTime };
}

// Pop-in einer Kachel inkl. der grauen Text-Balken, die mit einwachsen
// statt einfach nur mit der Kachel zusammen aufzutauchen.
function revealCard(buildLoop: gsap.core.Timeline, card: HTMLElement, time: number): void {
  buildLoop.to(
    card,
    { opacity: 1, scale: 1, duration: TIMING.popDuration, ease: TIMING.popEase },
    time
  );

  const bars = card.querySelectorAll<HTMLElement>('.code-showcase_workspace-bar');
  if (bars.length > 0) {
    buildLoop.to(
      bars,
      {
        width: (_i, el) => `${(el as HTMLElement).dataset.targetWidth}px`,
        stagger: TIMING.barRevealStagger,
        duration: TIMING.barRevealDuration,
        ease: 'power2.out',
      },
      time + TIMING.popDuration * 0.4
    );
  }
}

// Wie revealCard, aber für mehrere Karten als zusammengehörige Gruppe:
// alle poppen ab demselben Zeitpunkt, nur leicht gestaffelt zueinander,
// statt jede an einer eigenen Code-Zeile zu hängen.
function revealCardGroup(
  buildLoop: gsap.core.Timeline,
  cards: HTMLElement[],
  time: number,
  stagger: number
): void {
  buildLoop.to(
    cards,
    { opacity: 1, scale: 1, duration: TIMING.popDuration, ease: TIMING.popEase, stagger },
    time
  );

  cards.forEach((card, i) => {
    const bars = card.querySelectorAll<HTMLElement>('.code-showcase_workspace-bar');
    if (bars.length > 0) {
      buildLoop.to(
        bars,
        {
          width: (_j, el) => `${(el as HTMLElement).dataset.targetWidth}px`,
          stagger: TIMING.barRevealStagger,
          duration: TIMING.barRevealDuration,
          ease: 'power2.out',
        },
        time + i * stagger + TIMING.popDuration * 0.4
      );
    }
  });
}

export function initCodeShowcase(): void {
  const root = document.querySelector<HTMLElement>('[data-code-showcase]');
  if (!root) return; // früh abbrechen, wenn die Seite dieses Element nicht hat

  const ideWindow = root.querySelector<HTMLElement>('.code-showcase_ide');
  const browserWindow = root.querySelector<HTMLElement>('.code-showcase_browser');
  const linesContainer = root.querySelector<HTMLElement>('[data-code-lines]');
  const navIcons = root.querySelectorAll<HTMLElement>('.code-showcase_workspace-nav-icon');
  const statCards = root.querySelectorAll<HTMLElement>('.code-showcase_workspace-stat-card');
  const chartCard = root.querySelector<HTMLElement>('.code-showcase_workspace-chart-card');
  const chartLine = root.querySelector<SVGPolylineElement>(
    '.code-showcase_workspace-chart-svg polyline'
  );
  const chartFill = root.querySelector<SVGPolygonElement>(
    '.code-showcase_workspace-chart-svg polygon'
  );
  const listCard = root.querySelector<HTMLElement>('.code-showcase_workspace-list-card');
  const thumbCard = root.querySelector<HTMLElement>('.code-showcase_workspace-thumb-card');
  const allBars = root.querySelectorAll<HTMLElement>('.code-showcase_workspace-bar');

  if (
    !ideWindow ||
    !browserWindow ||
    !linesContainer ||
    !chartCard ||
    !chartLine ||
    !chartFill ||
    !listCard ||
    !thumbCard ||
    statCards.length !== 3
  ) {
    return;
  }

  // Chart-Linie fürs Zeichnen vorbereiten.
  const lineLength = chartLine.getTotalLength();
  gsap.set(chartLine, { strokeDasharray: lineLength, strokeDashoffset: lineLength });
  gsap.set(chartFill, { opacity: 0 });

  // Ausgangszustand – bewusst per GSAP statt als Webflow-Style, damit die
  // Card im Designer normal sichtbar bleibt.
  gsap.set([ideWindow, browserWindow], { opacity: 0, y: 16 });
  gsap.set([navIcons, statCards, chartCard, listCard, thumbCard], {
    opacity: 0,
    scale: 0.92,
  });

  // Zielbreite jedes Balkens VOR dem Verstecken messen.
  allBars.forEach((bar) => {
    bar.dataset.targetWidth = String(bar.getBoundingClientRect().width);
    gsap.set(bar, { width: 0 });
  });

  const { timeline: typewriter, cueTimes, navIconsTime } = buildTypewriter(linesContainer);

  const buildLoop = gsap.timeline({ repeat: -1, repeatDelay: TIMING.loopPause });
  buildLoop.add(typewriter, 0);

  buildLoop.to(
    navIcons,
    {
      opacity: 1,
      scale: 1,
      duration: TIMING.popDuration,
      ease: TIMING.popEase,
      stagger: TIMING.navIconStagger,
    },
    navIconsTime + TIMING.popGroupGap
  );

  revealCardGroup(
    buildLoop,
    Array.from(statCards),
    (cueTimes.statGroup ?? 0) + TIMING.popGroupGap,
    TIMING.statCardStagger
  );

  // Box kommt früh (an den Start des Chart-Abschnitts im Code gekoppelt).
  // Kurve + Gradient starten erst, sobald die Box-Pop-Animation selbst
  // fertig ist - nicht mehr an weiteren Code-Fortschritt gekoppelt.
  const chartBoxTime = (cueTimes.chartBox ?? 0) + TIMING.popGroupGap;
  buildLoop.to(
    chartCard,
    { opacity: 1, scale: 1, duration: TIMING.popDuration, ease: TIMING.popEase },
    chartBoxTime
  );

  const chartLineTime = chartBoxTime + TIMING.popDuration;
  buildLoop.to(chartFill, { opacity: 1, duration: TIMING.chartLineDuration * 0.5 }, chartLineTime);
  buildLoop.to(
    chartLine,
    { strokeDashoffset: 0, duration: TIMING.chartLineDuration, ease: 'power1.inOut' },
    chartLineTime
  );

  const tableTime = (cueTimes.table ?? 0) + TIMING.popGroupGap;
  revealCard(buildLoop, listCard, tableTime);
  revealCard(buildLoop, thumbCard, tableTime + 0.08);

  // Master-Timeline: Intro läuft nur EINMAL, danach übernimmt buildLoop
  // (der seinen eigenen repeat:-1 hat) dauerhaft den Loop-Teil. Startet
  // pausiert – erst wenn die Card in den Viewport scrollt, geht's los.
  const master = gsap.timeline({ paused: true });
  master.to([ideWindow, browserWindow], {
    opacity: 1,
    y: 0,
    duration: TIMING.entranceDuration,
    ease: 'power3.out',
    stagger: TIMING.entranceStagger,
  });
  master.add(buildLoop, `-=${TIMING.contentStartOverlap}`);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          master.play();
          observer.unobserve(root);
        }
      });
    },
    { threshold: IN_VIEW_THRESHOLD }
  );
  observer.observe(root);
}
