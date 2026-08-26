// src/components/code-showcase.ts
//
// Voraussetzung: gsap ist global verfügbar (CDN-Script-Tag im Webflow
// Head-Snippet, .d.ts liegt in src/types/ – siehe Konventionen).

interface CodeToken {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'function' | 'plain' | 'punct';
}

// Welcher Wireframe-Bereich rechts "gecoded" wird, wenn diese Zeile
// fertig getippt ist. Sitzt an der Zeile, nicht am Token.
type WireframeCue = 'stat1' | 'stat2' | 'stat3' | 'chart' | 'table';

interface CodeLine {
  tokens: CodeToken[];
  cue?: WireframeCue;
  // Markiert die letzte Zeile vor dem UI-relevanten Teil. Ab hier
  // (exklusiv dieser Zeile) läuft der echte Typewriter statt Fast-Pop.
  boundary?: boolean;
}

// Timings & Physik-Konstanten – hier live dran drehen.
const TIMING = {
  entranceDuration: 0.7, // einmaliges Einfliegen von IDE- und Browser-Fenster
  entranceStagger: 0.15,
  navIconStagger: 0.08,
  popDuration: 0.45, // Dauer eines einzelnen Kachel-Pop-ins
  popEase: 'back.out(1.7)',
  popGroupGap: 0.25, // Pause zwischen "Zeile fertig getippt" und Pop-in – das "Beat"-Gefühl
  barRevealDuration: 0.35, // die grauen Text-Balken selbst wachsen mit rein
  barRevealStagger: 0.05,
  typewriterCharDelay: 0.032, // Basis-Sekunden pro Zeichen (nur im echten Typewriter-Teil)
  lineDelay: 0.18, // Pause zwischen zwei getippten Zeilen
  groupPauseDelay: 0.95, // längere Pause bei Leerzeilen im relevanten Teil = "kurzes Nachdenken"
  popLineDuration: 0.09, // wie schnell eine Boilerplate-Zeile "reinploppt"
  popLineDelayMin: 0.05, // Pause zwischen zwei Pop-Zeilen, min
  popLineDelayMax: 0.16, // Pause zwischen zwei Pop-Zeilen, max – bewusst nicht konstant
  popBlankPause: 0.1, // kurze Pause bei Leerzeilen, solange wir noch im Pop-Teil sind
  tokenPauseChance: 0.22, // Chance auf eine kleine Zusatz-Pause nach einem Token
  tokenPauseDuration: 0.16,
  chartLineDuration: 0.9,
  loopPause: 1.4, // Pause zwischen zwei kompletten Loop-Durchläufen
} as const;

// Code-Inhalt fürs IDE-Fenster. Bewusst als Daten gepflegt statt in
// Webflow getippt (siehe animation-component-conventions.md). Realistisch
// verschachtelter React-Dashboard-Component (Interface, Hooks, mehrzeilige
// Props) statt eines simplen Einzeilers – Cues sitzen jeweils auf der
// SCHLIESSENDEN Zeile ("/>") einer Komponente, weil das Element erst dann
// "fertig gecoded" ist.
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
      { text: 'interface ', type: 'keyword' },
      { text: 'DashboardProps ', type: 'function' },
      { text: '{', type: 'plain' },
    ],
  },
  {
    tokens: [
      { text: '  workspaceId', type: 'plain' },
      { text: ': ', type: 'punct' },
      { text: 'string', type: 'string' },
      { text: ';', type: 'punct' },
    ],
  },
  {
    tokens: [
      { text: '  range?', type: 'plain' },
      { text: ': ', type: 'punct' },
      { text: "'7d' | '30d' | '90d'", type: 'string' },
      { text: ';', type: 'punct' },
    ],
  },
  { tokens: [{ text: '}', type: 'plain' }] },
  { tokens: [] },
  {
    tokens: [
      { text: 'export ', type: 'keyword' },
      { text: 'function ', type: 'keyword' },
      { text: 'Dashboard', type: 'function' },
      { text: '({ workspaceId, range = ', type: 'plain' },
      { text: "'30d'", type: 'string' },
      { text: ' }: ', type: 'punct' },
      { text: 'DashboardProps', type: 'string' },
      { text: ') {', type: 'plain' },
    ],
  },
  {
    tokens: [
      { text: '  const ', type: 'keyword' },
      { text: '{ data, isLoading, error } ', type: 'plain' },
      { text: '= ', type: 'punct' },
      { text: 'useDashboardData', type: 'function' },
      { text: '(workspaceId, range);', type: 'plain' },
    ],
  },
  {
    tokens: [
      { text: '  const ', type: 'keyword' },
      { text: '[selectedMetric, setSelectedMetric] ', type: 'plain' },
      { text: '= ', type: 'punct' },
      { text: 'useState', type: 'function' },
      { text: "('revenue');", type: 'plain' },
    ],
  },
  { tokens: [] },
  {
    tokens: [
      { text: '  useEffect', type: 'function' },
      { text: '(() => {', type: 'plain' },
    ],
  },
  {
    tokens: [
      { text: '    if ', type: 'keyword' },
      { text: '(!data) ', type: 'plain' },
      { text: 'return', type: 'keyword' },
      { text: ';', type: 'punct' },
    ],
  },
  {
    tokens: [
      { text: '    document.title ', type: 'plain' },
      { text: '= ', type: 'punct' },
      { text: '`Dashboard · ${data.workspaceName}`', type: 'string' },
      { text: ';', type: 'punct' },
    ],
  },
  { tokens: [{ text: '  }, [data]);', type: 'plain' }] },
  { tokens: [] },
  {
    tokens: [
      { text: '  if ', type: 'keyword' },
      { text: '(isLoading) ', type: 'plain' },
      { text: 'return ', type: 'keyword' },
      { text: '<DashboardSkeleton />;', type: 'function' },
    ],
  },
  {
    tokens: [
      { text: '  if ', type: 'keyword' },
      { text: '(error) ', type: 'plain' },
      { text: 'return ', type: 'keyword' },
      { text: '<ErrorState ', type: 'function' },
      { text: 'message={error.message} />;', type: 'plain' },
    ],
  },
  { tokens: [] },
  {
    tokens: [
      { text: '  return ', type: 'keyword' },
      { text: '(', type: 'plain' },
    ],
  },
  {
    boundary: true,
    tokens: [
      { text: '    <div ', type: 'plain' },
      { text: 'className=', type: 'plain' },
      { text: '"dashboard"', type: 'string' },
      { text: '>', type: 'plain' },
    ],
  },
  {
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
      { text: '{formatCurrency(data.revenue)}', type: 'plain' },
    ],
  },
  {
    tokens: [{ text: '          trend={data.revenueTrend}', type: 'plain' }],
  },
  { cue: 'stat1', tokens: [{ text: '        />', type: 'function' }] },
  { tokens: [{ text: '        <StatCard', type: 'function' }] },
  {
    tokens: [
      { text: '          label=', type: 'plain' },
      { text: '"Users"', type: 'string' },
    ],
  },
  {
    tokens: [
      { text: '          value=', type: 'plain' },
      { text: '{formatNumber(data.activeUsers)}', type: 'plain' },
    ],
  },
  { tokens: [{ text: '          trend={data.usersTrend}', type: 'plain' }] },
  { cue: 'stat2', tokens: [{ text: '        />', type: 'function' }] },
  { tokens: [{ text: '        <StatCard', type: 'function' }] },
  {
    tokens: [
      { text: '          label=', type: 'plain' },
      { text: '"Growth"', type: 'string' },
    ],
  },
  {
    tokens: [
      { text: '          value=', type: 'plain' },
      { text: '{`${data.growthRate}%`}', type: 'plain' },
    ],
  },
  { tokens: [{ text: '          trend={data.growthTrend}', type: 'plain' }] },
  { cue: 'stat3', tokens: [{ text: '        />', type: 'function' }] },
  { tokens: [{ text: '      </section>', type: 'plain' }] },
  { tokens: [] },
  {
    tokens: [
      { text: '      <section ', type: 'plain' },
      { text: 'className=', type: 'plain' },
      { text: '"dashboard__chart"', type: 'string' },
      { text: '>', type: 'plain' },
    ],
  },
  { tokens: [{ text: '        <Chart', type: 'function' }] },
  { tokens: [{ text: '          data={data.weeklyStats}', type: 'plain' }] },
  { tokens: [{ text: '          metric={selectedMetric}', type: 'plain' }] },
  {
    tokens: [{ text: '          onMetricChange={setSelectedMetric}', type: 'plain' }],
  },
  { cue: 'chart', tokens: [{ text: '        />', type: 'function' }] },
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
  { tokens: [{ text: '        <DataTable', type: 'function' }] },
  { tokens: [{ text: '          rows={data.recentOrders}', type: 'plain' }] },
  { tokens: [{ text: '          columns={ORDER_COLUMNS}', type: 'plain' }] },
  {
    tokens: [{ text: '          onRowClick={handleOrderClick}', type: 'plain' }],
  },
  { cue: 'table', tokens: [{ text: '        />', type: 'function' }] },
  { tokens: [{ text: '      </section>', type: 'plain' }] },
  { tokens: [{ text: '    </div>', type: 'plain' }] },
  { tokens: [{ text: '  );', type: 'plain' }] },
  { tokens: [{ text: '}', type: 'plain' }] },
];

// Baut die Zeilen-Elemente einmalig auf (persistieren über alle Loops)
// und gibt eine Timeline zurück, plus die Zeitpunkte für die Cues und
// den Übergang zum Typewriter-Teil (daran hängt initCodeShowcase() die
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
  let typewriterStarted = false;

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

  CODE_LINES.forEach((line) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'code-showcase_line';

    const content = document.createElement('span');
    content.className = 'code-showcase_line-content';
    lineEl.appendChild(content);
    track.appendChild(lineEl);

    const usePop = !typewriterStarted;

    // Viewport in Sicht scrollen, bevor diese Zeile drankommt. Rechnet
    // mit echten Pixel-Positionen, nicht mit einer geschätzten
    // Zeilenzahl – funktioniert dadurch unabhängig von der tatsächlichen
    // Card-Größe.
    tl.call(() => {
      const overflowY = lineEl.offsetTop + lineEl.offsetHeight - linesContainer.clientHeight;
      if (overflowY > 0) {
        gsap.to(track, { y: -overflowY, duration: 0.35, ease: 'power2.out' });
      }
    });

    if (line.tokens.length === 0) {
      tl.to({}, { duration: usePop ? TIMING.popBlankPause : TIMING.groupPauseDelay });
      if (line.boundary) {
        typewriterStarted = true;
        navIconsTime = tl.duration();
      }
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
      // Boilerplate: Zeile ploppt komplett rein statt Zeichen für Zeichen,
      // mit leicht unterschiedlichem Delay zur nächsten Zeile.
      tl.to(content, { width: targetWidth, duration: TIMING.popLineDuration, ease: 'power1.out' });
      tl.set(cursor, { x: targetWidth });
      const gap =
        TIMING.popLineDelayMin + Math.random() * (TIMING.popLineDelayMax - TIMING.popLineDelayMin);
      tl.to({}, { duration: gap });
    } else {
      // Relevanter Teil: echter Zeichen-für-Zeichen-Typewriter.
      let cumulativeWidth = 0;
      tokenEls.forEach((span, index) => {
        const tokenWidth = span.offsetWidth;
        const fromWidth = cumulativeWidth;
        cumulativeWidth += tokenWidth;
        const charCount = line.tokens[index].text.length;

        const jitter = 0.7 + Math.random() * 0.6; // wirkt weniger maschinell
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

        if (Math.random() < TIMING.tokenPauseChance) {
          tl.to({}, { duration: TIMING.tokenPauseDuration });
        }
      });

      if (line.cue) {
        cueTimes[line.cue] = tl.duration();
      }

      tl.to({}, { duration: TIMING.lineDelay });
    }

    if (line.boundary) {
      typewriterStarted = true;
      navIconsTime = tl.duration();
    }
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

  // Zielbreite jedes Balkens VOR dem Verstecken messen, damit der
  // spätere Reveal exakt auf den in Webflow gesetzten Wert zuläuft.
  allBars.forEach((bar) => {
    bar.dataset.targetWidth = String(bar.getBoundingClientRect().width);
    gsap.set(bar, { width: 0 });
  });

  const { timeline: typewriter, cueTimes, navIconsTime } = buildTypewriter(linesContainer);

  // Der eigentliche Loop: Typewriter + Pop-ins, läuft unendlich mit Pause.
  const buildLoop = gsap.timeline({ repeat: -1, repeatDelay: TIMING.loopPause });

  buildLoop.add(typewriter, 0);

  // Sidebar-Icons feuern genau am Übergang von Boilerplate zu echtem
  // Typewriter – fühlt sich an wie "jetzt beginnt der UI-Teil", statt
  // einfach Teil der Intro-Animation zu sein.
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

  // Jede Stat-Card poppt einzeln, direkt nachdem IHRE Code-Zeile fertig
  // getippt ist – nicht alle drei im Block hintereinander.
  revealCard(buildLoop, statCards[0], (cueTimes.stat1 ?? 0) + TIMING.popGroupGap);
  revealCard(buildLoop, statCards[1], (cueTimes.stat2 ?? 0) + TIMING.popGroupGap);
  revealCard(buildLoop, statCards[2], (cueTimes.stat3 ?? 0) + TIMING.popGroupGap);

  // Chart: erst die Karte, dann die Linie "zeichnen".
  const chartTime = (cueTimes.chart ?? 0) + TIMING.popGroupGap;
  buildLoop.to(
    chartCard,
    { opacity: 1, scale: 1, duration: TIMING.popDuration, ease: TIMING.popEase },
    chartTime
  );
  buildLoop.to(chartFill, { opacity: 1, duration: TIMING.chartLineDuration * 0.5 }, '<');
  buildLoop.to(
    chartLine,
    { strokeDashoffset: 0, duration: TIMING.chartLineDuration, ease: 'power1.inOut' },
    '<'
  );

  // Untere Reihe: beide Boxen an der DataTable-Zeile.
  const tableTime = (cueTimes.table ?? 0) + TIMING.popGroupGap;
  revealCard(buildLoop, listCard, tableTime);
  revealCard(buildLoop, thumbCard, tableTime + 0.08);

  // Master-Timeline: Intro läuft nur EINMAL, danach übernimmt buildLoop
  // (der seinen eigenen repeat:-1 hat) dauerhaft den Loop-Teil.
  const master = gsap.timeline();
  master.to([ideWindow, browserWindow], {
    opacity: 1,
    y: 0,
    duration: TIMING.entranceDuration,
    ease: 'power3.out',
    stagger: TIMING.entranceStagger,
  });
  master.add(buildLoop);
}
