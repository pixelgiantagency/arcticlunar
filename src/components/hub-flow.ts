// src/components/hub-flow.ts
//
// Hub-and-Spoke-Verbindungsanimation: zentraler Node, N äußere Nodes,
// gestrichelte Pfade dazwischen, Partikel-"Kometenschweif" der die Pfade
// entlangwandert (SVG SMIL <animateMotion>), plus zwei pulsierende Ringe
// um den Zentral-Node (GSAP).
//
// ICONS: werden NICHT in dieser Datei gepflegt. Stattdessen kommen sie als
// normale <img>-Elemente aus Webflow, platziert irgendwo im [data-hub-flow]
// Element, markiert mit data-hub-icon="<node-id>". JS liest nur deren src
// aus und zeichnet daraus ein SVG-natives <image> an der richtigen Node-
// Position — Icon austauschen = in Webflow neues Bild hochladen, fertig,
// kein Code anfassen.
//
// Erwartet ein global verfügbares `gsap` (siehe bestehende gsap.d.ts /
// CDN-Script-Tag-Konvention — gleiches Muster wie bei den anderen Components).

// ---------------------------------------------------------------------------
// KONFIGURATION — alles Visuelle/Zeitliche wird ausschliesslich hier angepasst.
// ---------------------------------------------------------------------------

interface HubFlowNode {
  /** Muss zum data-hub-icon="..." Attribut des zugehörigen <img> in Webflow passen. */
  id: string;
  x: number;
  y: number;
  radius: number;
  /** Farbe des Platzhalter-Punkts, falls (noch) kein passendes <img> gefunden wird. */
  placeholderColor: string;
}

interface HubFlowConfig {
  viewBox: { x: number; y: number; width: number; height: number };

  center: { x: number; y: number; radius: number; placeholderColor: string };

  /** Reihenfolge bestimmt gleichzeitig die Start-Staffelung der Linien (siehe particle.lineStartStagger). */
  nodes: HubFlowNode[];

  nodeFill: string;
  nodeStroke: string;

  /** Größe (Breite/Höhe in SVG-Einheiten) der Icons, zentriert auf der jeweiligen Node. */
  icon: { outerSize: number; centerSize: number };

  line: {
    color: string;
    width: number;
    dashArray: string;
    /** Länge des geraden Stücks direkt am Hub, bevor die Ecke einsetzt. */
    leadIn: number;
    /** Länge des geraden Stücks am Zielknoten, bevor die Linie ankommt. */
    leadOut: number;
    /** Horizontale Ausdehnung jeder abgerundeten Ecke. */
    cornerRun: number;
    /** Vertikale Ausdehnung jeder abgerundeten Ecke. */
    cornerRise: number;
    /** Abstand der Austrittspunkte vom echten Hub-Kreisrand nach innen. */
    edgeGap: number;
    /** Vertikaler Abstand zwischen mehreren Austrittspunkten auf derselben Hub-Seite. */
    laneGap: number;
  };

  particle: {
    color: string;
    headColor: string;
    /** Anzahl Partikel im Schweif pro Linie. */
    count: number;
    /** Dauer einer Bewegung entlang des Pfads, in Sekunden. */
    lapDuration: number;
    /** Pause zwischen zwei Durchläufen derselben Linie, in Sekunden. */
    pauseBetweenLaps: number;
    /** Zeitversatz pro Partikel-Index, erzeugt den Schweif-Effekt. */
    trailStagger: number;
    /** Exponent der Opacity-Kurve entlang des Schweifs (höher = schärferer Ausklang). */
    trailFadeCurve: number;
    headSize: { width: number; height: number; radius: number };
    trailSize: { width: number; height: number; radius: number };
    /** Start-Delay-Abstand zwischen den einzelnen Linien, in Sekunden. */
    lineStartStagger: number;
  };

  pulse: {
    color: string;
    ringCount: number;
    maxRadius: number;
    /** Dauer einer Richtung (GSAP yoyo verdoppelt das für einen vollen Zyklus). */
    duration: number;
    /** Zeitversatz zwischen den einzelnen Ringen, in Sekunden. */
    ringDelayOffset: number;
    ease: string;
  };

  /** Bei reduzierter Bewegungspräferenz (prefers-reduced-motion) statische Darstellung statt Animation. */
  respectReducedMotion: boolean;
}

const CONFIG: HubFlowConfig = {
  // Exakter Original-Ausschnitt (Original-Canvas ist höher, wird von y=120 bis y=320 beschnitten).
  viewBox: { x: 0, y: 120, width: 560, height: 200 },

  center: { x: 280.23, y: 221.21, radius: 41.54, placeholderColor: '#f5f5f5' },

  // Exakte Original-Koordinaten (aus dem echten gerenderten SVG abgelesen).
  nodes: [
    { id: 'left', x: 43.06, y: 219.86, radius: 18.06, placeholderColor: '#f5f5f5' },
    { id: 'top-left', x: 123.44, y: 167.93, radius: 18.06, placeholderColor: '#f5a524' },
    { id: 'bottom-left', x: 123.44, y: 274.04, radius: 18.06, placeholderColor: '#e5e5e5' },
    { id: 'top-right', x: 434.89, y: 167.93, radius: 18.06, placeholderColor: '#3b5bfa' },
    { id: 'bottom-right', x: 434.89, y: 274.04, radius: 18.06, placeholderColor: '#34d399' },
    { id: 'right', x: 515.27, y: 219.86, radius: 18.06, placeholderColor: '#f5f5f5' },
  ],

  // Deutlich deckend, damit Partikel/Linien dahinter sauber verschwinden
  // (vorher zu transparent -> "scheint durch"-Bug).
  nodeFill: 'rgba(38, 38, 42, 0.94)',
  nodeStroke: 'rgba(255, 255, 255, 0.10)',

  icon: { outerSize: 20, centerSize: 48 },

  line: {
    color: 'rgba(255, 255, 255, 0.18)',
    width: 0.5,
    dashArray: '4 4',
    /** Länge des geraden Stücks direkt am Hub, bevor die Ecke einsetzt. */
    leadIn: 18,
    /** Länge des geraden Stücks am Zielknoten, bevor die Linie ankommt. */
    leadOut: 47,
    /** Horizontale Ausdehnung jeder abgerundeten Ecke. */
    cornerRun: 12.5,
    /** Vertikale Ausdehnung jeder abgerundeten Ecke (kleiner als cornerRun -> flacherer Knick, wie im Original). */
    cornerRise: 7.2,
    /** Abstand der Austrittspunkte vom echten Hub-Kreisrand nach innen. */
    edgeGap: 2,
    /** Vertikaler Abstand zwischen mehreren Austrittspunkten, die auf derselben Seite vom Hub abgehen. */
    laneGap: 18.5,
  },

  particle: {
    color: '#34d399',
    headColor: '#f5f5f5',
    count: 20,
    lapDuration: 2.35,
    pauseBetweenLaps: 1.2,
    trailStagger: 0.008,
    trailFadeCurve: 2.2,
    headSize: { width: 8, height: 3, radius: 1.5 },
    trailSize: { width: 6, height: 2, radius: 1 },
    lineStartStagger: 0.6,
  },

  pulse: {
    color: 'rgba(255, 255, 255, 0.35)',
    ringCount: 2,
    maxRadius: 70,
    duration: 1.1,
    ringDelayOffset: 0.35,
    ease: 'power1.inOut',
  },

  respectReducedMotion: true,
};

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------------------
// Icon-Quellen aus dem Webflow-DOM einsammeln (bevor wir root.innerHTML ersetzen!)
// ---------------------------------------------------------------------------

function collectIconSources(root: HTMLElement): Map<string, string> {
  const sources = new Map<string, string>();

  root.querySelectorAll<HTMLImageElement>('img[data-hub-icon]').forEach((img) => {
    const key = img.getAttribute('data-hub-icon');
    const src = img.currentSrc || img.src;
    if (key && src) sources.set(key, src);
  });

  return sources;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '%22');
}

// ---------------------------------------------------------------------------
// Pfad-Erzeugung
//
// Baut eine "Leiterbahn"-Verbindung zwischen zwei Nodes: gerade raus aus
// Node A -> abgerundete Ecke -> Diagonale -> abgerundete Ecke -> gerade
// rein in Node B. Alles wird aus den beiden Mittelpunkten + Radien +
// einem optionalen vertikalen Lane-Offset berechnet -> Node verschieben
// genügt, der Pfad passt sich automatisch an.
// ---------------------------------------------------------------------------

const BEZIER_KAPPA = 0.552; // Standard-Konstante zur Kreisbogen-Annäherung per Cubic Bezier

// Wenn mehrere Linien von derselben Seite eines Nodes abgehen (z.B. 3 Linien
// vom Hub nach rechts), sollen sie nicht alle vom selben Punkt starten,
// sondern vertikal gestaffelt vom Kreisrand -- wie im Original. Sortiert
// nach Ziel-Y und verteilt sie gleichmäßig um die Node-Mitte herum.
function assignExitOffsets(
  nodes: HubFlowNode[],
  hubX: number,
  laneGap: number
): Map<string, number> {
  const sides = new Map<number, HubFlowNode[]>();

  nodes.forEach((node) => {
    const dir = node.x >= hubX ? 1 : -1;
    const list = sides.get(dir) ?? [];
    list.push(node);
    sides.set(dir, list);
  });

  const offsets = new Map<string, number>();

  sides.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.y - b.y);
    const count = sorted.length;
    sorted.forEach((node, i) => {
      offsets.set(node.id, (i - (count - 1) / 2) * laneGap);
    });
  });

  return offsets;
}

function buildConnectorPath(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
  exitOffsetY: number,
  opts: { leadIn: number; leadOut: number; cornerRun: number; cornerRise: number; edgeGap: number }
): string {
  const dir = x2 >= x1 ? 1 : -1;

  // Austrittspunkt: leicht innerhalb des echten Kreisrands (edgeGap),
  // vertikal versetzt um exitOffsetY (Lane-Staffelung bei mehreren Linien).
  const effR1 = Math.max(r1 - opts.edgeGap, 0);
  const clampedOffset = Math.max(-effR1, Math.min(effR1, exitOffsetY));
  const startY = y1 + clampedOffset;
  const startX = x1 + dir * Math.sqrt(Math.max(effR1 * effR1 - clampedOffset * clampedOffset, 0));

  // Eintrittspunkt: exakt auf dem Kreisrand des Zielknotens, kein Gap
  // (jeder äußere Node hat ja nur eine einzige ankommende Linie).
  const endX = x2 - dir * r2;
  const endY = y2;
  const dy = endY - startY;

  if (Math.abs(dy) < 0.5) {
    return `M${startX} ${startY} L${endX} ${endY}`;
  }

  const vDir = dy >= 0 ? 1 : -1;
  const { leadIn, leadOut, cornerRun } = opts;
  // Falls der Höhenunterschied kleiner ist als 2x cornerRise, die Ecken-
  // Steigung proportional stauchen, damit die Diagonale nicht kollabiert.
  const cornerRise = Math.min(opts.cornerRise, Math.abs(dy) / 2);

  const p1x = startX + dir * leadIn;
  const p1y = startY;

  const p2x = p1x + dir * cornerRun;
  const p2y = p1y + vDir * cornerRise;

  const p3x = endX - dir * leadOut - dir * cornerRun;
  const p3y = endY - vDir * cornerRise;

  const p4x = endX - dir * leadOut;
  const p4y = endY;

  // Tangenten-Richtung der Diagonale (p2 -> p3). Die Ecken-Kurven müssen
  // GENAU in diese Richtung auslaufen/einlaufen, sonst gibt es einen
  // Knick an p2/p3 -> sichtbares "Wackeln" der rotate="auto"-Partikel
  // beim Durchqueren dieser Stelle (war vorher ein Bug: Ecken liefen
  // strikt vertikal aus statt in Richtung der tatsächlichen Diagonale).
  const diagDx = p3x - p2x;
  const diagDy = p3y - p2y;
  const diagLen = Math.sqrt(diagDx * diagDx + diagDy * diagDy) || 1;
  const ux = diagDx / diagLen;
  const uy = diagDy / diagLen;

  const leadKx = cornerRun * BEZIER_KAPPA;
  const cornerSize = Math.sqrt(cornerRun * cornerRun + cornerRise * cornerRise) * BEZIER_KAPPA;

  return [
    `M${startX} ${startY}`,
    `L${p1x} ${p1y}`,
    // Ecke 1: horizontale Tangente bei p1 -> Tangente entlang der Diagonale bei p2
    `C${p1x + dir * leadKx} ${p1y} ${p2x - ux * cornerSize} ${p2y - uy * cornerSize} ${p2x} ${p2y}`,
    `L${p3x} ${p3y}`,
    // Ecke 2: Tangente entlang der Diagonale bei p3 -> horizontale Tangente bei p4
    `C${p3x + ux * cornerSize} ${p3y + uy * cornerSize} ${p4x - dir * leadKx} ${p4y} ${p4x} ${p4y}`,
    `L${endX} ${endY}`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Markup-Bausteine
// ---------------------------------------------------------------------------

function buildParticleMarkup(lineId: string, pathD: string, startDelay: number): string {
  const p = CONFIG.particle;
  const headId = `${lineId}-head`;
  const headBegin = `${startDelay}s; ${headId}.end+${p.pauseBetweenLaps}s`;

  let markup = `<path d="${pathD}" class="alx-hub-line" fill="none" stroke="${CONFIG.line.color}" stroke-width="${CONFIG.line.width}" style="stroke-dasharray:${CONFIG.line.dashArray}" />`;

  for (let c = 0; c < p.count; c++) {
    const t = c / (p.count - 1);
    const opacity = Math.pow(t, p.trailFadeCurve);
    const offset = p.trailStagger * (p.count - 1 - c);
    const begin = `${startDelay + offset}s; ${headId}.end+${p.pauseBetweenLaps + offset}s`;
    const w = p.trailSize.width;
    const h = p.trailSize.height;

    markup += `
      <g opacity="0">
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${p.trailSize.radius}" fill="${p.color}" fill-opacity="${opacity}" />
        <animateMotion dur="${p.lapDuration}s" begin="${begin}" fill="remove" path="${pathD}" rotate="auto" />
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${p.lapDuration}s" begin="${begin}" fill="remove" />
      </g>`;
  }

  const hw = p.headSize.width;
  const hh = p.headSize.height;
  markup += `
    <g opacity="0">
      <rect x="${-hw / 2}" y="${-hh / 2}" width="${hw}" height="${hh}" rx="${p.headSize.radius}" fill="${p.headColor}" />
      <animateMotion id="${headId}" dur="${p.lapDuration}s" begin="${headBegin}" fill="remove" path="${pathD}" rotate="auto" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${p.lapDuration}s" begin="${headBegin}" fill="remove" />
    </g>`;

  return markup;
}

function buildNodeMarkup(
  x: number,
  y: number,
  radius: number,
  placeholderColor: string,
  iconHref: string | undefined,
  iconSize: number
): string {
  const icon = iconHref
    ? `<image href="${escapeAttr(iconHref)}" xlink:href="${escapeAttr(iconHref)}" x="${x - iconSize / 2}" y="${
        y - iconSize / 2
      }" width="${iconSize}" height="${iconSize}" />`
    : `<circle cx="${x}" cy="${y}" r="4" fill="${placeholderColor}" />`;

  return `
    <g class="alx-hub-node">
      <circle cx="${x}" cy="${y}" r="${radius}" fill="${CONFIG.nodeFill}" stroke="${CONFIG.nodeStroke}" stroke-width="1" />
      ${icon}
    </g>`;
}

function buildAnimatedMarkup(iconSources: Map<string, string>): string {
  const vb = CONFIG.viewBox;
  let lines = '';

  const exitOffsets = assignExitOffsets(CONFIG.nodes, CONFIG.center.x, CONFIG.line.laneGap);

  CONFIG.nodes.forEach((node, index) => {
    const d = buildConnectorPath(
      CONFIG.center.x,
      CONFIG.center.y,
      CONFIG.center.radius,
      node.x,
      node.y,
      node.radius,
      exitOffsets.get(node.id) ?? 0,
      CONFIG.line
    );
    const delay = index * CONFIG.particle.lineStartStagger;
    lines += buildParticleMarkup(`alx-hub-line-${index}`, d, delay);
  });

  let nodes = '';
  CONFIG.nodes.forEach((node) => {
    nodes += buildNodeMarkup(
      node.x,
      node.y,
      node.radius,
      node.placeholderColor,
      iconSources.get(node.id),
      CONFIG.icon.outerSize
    );
  });

  const pulseRings = Array.from({ length: CONFIG.pulse.ringCount })
    .map(
      (_, i) =>
        `<circle class="alx-hub-pulse" data-ring="${i}" cx="${CONFIG.center.x}" cy="${CONFIG.center.y}" r="${CONFIG.center.radius}" fill="none" stroke="${CONFIG.pulse.color}" stroke-width="${i === 0 ? 1.5 : 1}" />`
    )
    .join('');

  const centerNode = buildNodeMarkup(
    CONFIG.center.x,
    CONFIG.center.y,
    CONFIG.center.radius,
    CONFIG.center.placeholderColor,
    iconSources.get('center'),
    CONFIG.icon.centerSize
  );

  return `<svg viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink">${lines}${pulseRings}${centerNode}${nodes}</svg>`;
}

function buildStaticMarkup(iconSources: Map<string, string>): string {
  const vb = CONFIG.viewBox;
  let lines = '';
  let nodes = '';

  const exitOffsets = assignExitOffsets(CONFIG.nodes, CONFIG.center.x, CONFIG.line.laneGap);

  CONFIG.nodes.forEach((node) => {
    const d = buildConnectorPath(
      CONFIG.center.x,
      CONFIG.center.y,
      CONFIG.center.radius,
      node.x,
      node.y,
      node.radius,
      exitOffsets.get(node.id) ?? 0,
      CONFIG.line
    );
    lines += `<path d="${d}" fill="none" stroke="${CONFIG.line.color}" stroke-width="${CONFIG.line.width}" style="stroke-dasharray:${CONFIG.line.dashArray}" />`;
    nodes += buildNodeMarkup(
      node.x,
      node.y,
      node.radius,
      node.placeholderColor,
      iconSources.get(node.id),
      CONFIG.icon.outerSize
    );
  });

  nodes += buildNodeMarkup(
    CONFIG.center.x,
    CONFIG.center.y,
    CONFIG.center.radius,
    CONFIG.center.placeholderColor,
    iconSources.get('center'),
    CONFIG.icon.centerSize
  );

  return `<svg viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}" xmlns="${SVG_NS}" xmlns:xlink="http://www.w3.org/1999/xlink">${lines}${nodes}</svg>`;
}

// ---------------------------------------------------------------------------
// Pulse-Ringe (GSAP)
// ---------------------------------------------------------------------------

function animatePulseRings(root: HTMLElement): void {
  const rings = root.querySelectorAll<SVGCircleElement>('.alx-hub-pulse');
  const p = CONFIG.pulse;

  rings.forEach((ring, i) => {
    gsap.to(ring, {
      attr: { r: p.maxRadius },
      opacity: 0,
      duration: p.duration,
      repeat: -1,
      yoyo: true,
      ease: p.ease,
      delay: i * p.ringDelayOffset,
    });
  });
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

export function initHubFlow(): void {
  const root = document.querySelector<HTMLElement>('[data-hub-flow]');
  if (!root) return; // früh abbrechen, wenn die Seite dieses Element nicht hat

  // WICHTIG: Icon-Quellen müssen ausgelesen werden, BEVOR wir root.innerHTML
  // überschreiben — sonst sind die <img data-hub-icon="..."> Elemente weg.
  const iconSources = collectIconSources(root);

  root.classList.add('alx-hub-flow');

  const prefersReducedMotion =
    CONFIG.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    root.innerHTML = buildStaticMarkup(iconSources);
    return;
  }

  root.innerHTML = buildAnimatedMarkup(iconSources);
  animatePulseRings(root);
}
