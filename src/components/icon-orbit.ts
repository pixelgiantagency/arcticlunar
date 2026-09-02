/**
 * Icon-Orbit-Card: Icons kreisen auf konzentrischen Halbkreis-Ringen um eine
 * rotierende Partikel-Kugel ("Planet"). Sichtbar ist bewusst nur die obere
 * Hälfte: Ringe & Kugel teilen sich einen Mittelpunkt knapp unterhalb des
 * Containers. Icons laufen NICHT auf einem vollen 360°-Kreis (der zur Hälfte
 * unsichtbar wäre), sondern nur innerhalb des sichtbaren 180°-Bogens - beim
 * Verlassen des Bogens auf einer Seite erscheinen sie sofort wieder am
 * Bogenanfang der gegenüberliegenden Seite (Winkel-Wrap, kein unsichtbarer
 * Umweg), mit kurzem Ein-/Ausblenden statt hartem Pop.
 *
 * Ziel-Element in Webflow: leeres Element mit Custom Attribute `data-icon-orbit`.
 * Icons als normale Kind-Elemente in Webflow platzieren, keine Positionierung
 * dort nötig (übernimmt dieses Script). Beispiel für die Default-Verteilung
 * (3 Ringe, von innen nach außen 3 / 2 / 3 Icons):
 *
 *   <div data-icon-orbit>
 *     <img data-icon-orbit-icon data-ring="1" src="..." alt="Figma">
 *     <img data-icon-orbit-icon data-ring="1" src="..." alt="React">
 *     <img data-icon-orbit-icon data-ring="1" src="..." alt="Sparkle">
 *     <img data-icon-orbit-icon data-ring="2" src="..." alt="Slack">
 *     <img data-icon-orbit-icon data-ring="2" src="..." alt="Python">
 *     <img data-icon-orbit-icon data-ring="3" src="..." alt="Gemini">
 *     <img data-icon-orbit-icon data-ring="3" src="..." alt="Sun">
 *     <img data-icon-orbit-icon data-ring="3" src="..." alt="Flower">
 *   </div>
 *
 * `data-ring` ist optional (1 = innerster Ring). Fehlt es, werden Icons in
 * Reihenfolge per Round-Robin auf die Ringe verteilt - für eine exakte
 * Stückzahl pro Ring (wie 3/2/3 oben) `data-ring` explizit setzen.
 *
 * Richtung pro Ring alternierend (positive `speed` = im Uhrzeigersinn/"rechts
 * rum", negativ = gegen den Uhrzeigersinn/"links rum"): Ring 1 rechts, Ring 2
 * links, Ring 3 rechts - fix im Code (siehe RING_MOTION unten), nicht per
 * Attribut einstellbar.
 *
 * Drei Werte lassen sich OHNE Code-Änderung direkt in Webflow tweaken -
 * einfach als Custom Attribute auf das `data-icon-orbit`-Element setzen
 * (Dezimalzahl als String, Punkt statt Komma). Fehlt ein Attribut, greift
 * der Default:
 *
 *   data-sphere-radius="0.38"    Größe der Kugel (Anteil der kleineren Card-Kante)
 *   data-first-ring-gap="0.14"   Abstand zwischen Kugel-Rand und erstem Ring
 *   data-ring-gap="0.2"          Abstand zwischen zwei benachbarten Ringen
 *
 * Ring-Radien ergeben sich daraus automatisch: Ring 1 = sphere-radius +
 * first-ring-gap, Ring 2 = Ring 1 + ring-gap, Ring 3 = Ring 2 + ring-gap.
 *
 * Zusätzlich, ebenfalls optional:
 *
 *   data-icon-bg="#ffffff"            Hintergrundfarbe der Icon-Badges
 *   data-icon-border-color="#e5e7eb"  Randfarbe der Icon-Badges selbst (Default: transparent, kein Rand)
 *   data-ring-color="#e5e7eb"         Randfarbe der Ring-Bögen (nicht der Icon-Badges!)
 *   data-sphere-color="#5a82ff"       Grundfarbe der Kugel-Partikel
 *   data-sphere-accent-color="#ff9646" Farbe der vereinzelten Akzent-Partikel
 *
 * Alle fünf akzeptieren jedes gültige CSS-Farbformat (Hex, rgb(), hsl(), oklch(),
 * Named Colors ...) oder direkt einen var(--webflow-variable)-Verweis, wenn du
 * eine Webflow-Variable nutzen willst. Bei den beiden Kugel-Farben passiert die
 * Auflösung technisch anders als bei Hintergrund/Rand (siehe cssColor() unten):
 * Canvas kennt kein var(), deshalb wird der Wert einmalig beim Init über ein
 * echtes DOM-Element aufgelöst und in konkrete RGB-Kanäle umgerechnet - ändert
 * sich die referenzierte Webflow-Variable später zur Laufzeit (z.B. Theme-
 * Umschaltung ohne Reload), zieht die Kugel das anders als bei den übrigen
 * Farb-Attributen NICHT automatisch nach.
 */

// ---- Werte zum visuellen Live-Tuning ---------------------------------------

/** Default-Farben der Partikel-Kugel (RGB 0-255), überschreibbar per data-sphere-color / data-sphere-accent-color. */
const SPHERE_COLORS = {
  base: { r: 90, g: 130, b: 255 }, // Grundfarbe der Punkte
  accent: { r: 255, g: 150, b: 70 }, // vereinzelte warme Akzent-Punkte
  accentChance: 0.07, // Wahrscheinlichkeit pro Punkt für die Akzentfarbe (nicht per Attribut einstellbar)
};

/** Geometrie & Bewegung der Partikel-Kugel (Größe selbst steht in DEFAULTS.sphereRadius, s.u.). */
const SPHERE = {
  particleCount: 1100,
  rotationSpeed: 0.14, // Radiant/Sekunde um die Y-Achse
  jitter: 0.08, // Streuung der Punkte um die Kugeloberfläche (0 = exakt auf der Oberfläche)
  minDotSize: 0.6,
  maxDotSize: 1.9,
  minAlpha: 0.22, // Deckkraft der am weitesten entfernten Punkte
  maxAlpha: 0.9, // Deckkraft der vordersten Punkte
};

/**
 * Default-Werte für die drei per Webflow-Attribut überschreibbaren Größen
 * (siehe Kopfkommentar). Alle als Anteil der kleineren Card-Kante.
 */
const DEFAULTS = {
  sphereRadius: 0.38,
  firstRingGap: 0.14,
  ringGap: 0.2,
};

/**
 * Richtung & Geschwindigkeit pro Ring - fix im Code, nicht per Attribut
 * einstellbar. Index 0 = innerster Ring. `speed` positiv = im Uhrzeigersinn
 * ("rechts rum"), negativ = gegen den Uhrzeigersinn ("links rum") - bewusst
 * alternierend für einen ruhigen, nicht synchronen Gesamteindruck.
 */
const RING_MOTION = [
  { speed: 0.075 }, // 1. Ring (innen) - rechts rum
  { speed: -0.06 }, // 2. Ring (mitte) - links rum
  { speed: 0.05 }, // 3. Ring (außen) - rechts rum
] as const;

/** Gemeinsamer Mittelpunkt von Ringen & Kugel, als Vielfaches der Container-Höhe (>1 = unterhalb des Containers). */
const DOME_CENTER_Y_FACTOR = 1.05;

/**
 * Sichtbarer Bogen, auf dem sich Icons bewegen: ein Halbkreis von links (π)
 * über oben (1.5π) bis rechts (2π). Icons laufen NICHT über den vollen Kreis
 * (untere, unsichtbare Hälfte) - beim Erreichen eines Bogenendes springt der
 * Winkel direkt an den Bogenanfang der Gegenseite (siehe wrapAngle()).
 */
const ARC_START = Math.PI;
const ARC_SPAN = Math.PI;

/** Anteil des Bogens an jedem Ende, in dem Icons sanft ein-/ausblenden statt hart zu poppen. */
const EDGE_FADE = 0;

// ---- Typen ------------------------------------------------------------------

interface Particle {
  /** Position auf der Einheitskugel (vor Rotation). */
  x: number;
  y: number;
  z: number;
  size: number;
  rgb: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface OrbitIcon {
  el: HTMLElement;
  ringIndex: number;
  angle: number;
}

interface OrbitState {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ringEls: HTMLElement[];
  icons: OrbitIcon[];
  particles: Particle[];
  width: number;
  height: number;
  sphereRotation: number;
  motionScale: number;
  sphereRadius: number; // Anteil der kleineren Card-Kante, aus data-sphere-radius oder DEFAULTS
  ringRadii: number[]; // dito pro Ring, aus sphereRadius + first-ring-gap + n * ring-gap
}

// ---- Hilfsfunktionen ----------------------------------------------------

/** Liest eine Dezimalzahl aus einem Webflow-Custom-Attribute; bei Fehlen/ungültigem Wert greift der Fallback. */
function readNumberAttr(el: HTMLElement, attr: string, fallback: number): number {
  const raw = el.getAttribute(attr);
  const parsed = raw === null ? NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Setzt eine CSS-Custom-Property aus einem Webflow-Attribute, falls vorhanden - sonst greift der CSS-eigene var()-Fallback. */
function applyCssVarFromAttr(el: HTMLElement, cssVar: string, attr: string): void {
  const value = el.getAttribute(attr);
  if (value !== null && value.trim() !== '') {
    el.style.setProperty(cssVar, value.trim());
  }
}

/**
 * Löst einen beliebigen CSS-Farbwert (Hex, rgb(), hsl(), oklch(), color-mix(),
 * var(--webflow-variable) ...) zu konkreten RGB-Kanälen auf. Canvas-fillStyle
 * kann var() nicht selbst auflösen (anders als echte CSS-Properties wie
 * background), deshalb: ein echtes, unsichtbares DOM-Element im richtigen
 * Vererbungskontext einfärben, den vom Browser aufgelösten computed style
 * abgreifen, auf ein 1x1-Canvas zeichnen und die Bytes zurücklesen. Nie hart
 * auf ein einzelnes Farbformat festlegen.
 */
function cssColor(value: string, contextEl: HTMLElement): RGB {
  const probe = document.createElement('span');
  probe.style.color = value;
  contextEl.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0 };

  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);

  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

/** Liest eine Farbe aus einem Webflow-Custom-Attribute und löst sie über cssColor() auf; bei Fehlen greift der Fallback. */
function readColorAttr(el: HTMLElement, attr: string, fallback: RGB): RGB {
  const raw = el.getAttribute(attr);
  if (raw === null || raw.trim() === '') return fallback;
  return cssColor(raw.trim(), el);
}

/** Ring-Radien aus Kugelradius + den beiden Abständen ableiten (Ring 1 = sphereRadius + firstRingGap, danach + ringGap je weiterem Ring). */
function computeRingRadii(sphereRadius: number, firstRingGap: number, ringGap: number): number[] {
  const first = sphereRadius + firstRingGap;
  return RING_MOTION.map((_ring, i) => first + i * ringGap);
}

function createRingElements(root: HTMLElement): HTMLElement[] {
  return RING_MOTION.map(() => {
    const ring = document.createElement('div');
    ring.className = 'icon-orbit_ring';
    root.appendChild(ring);
    return ring;
  });
}

function collectIcons(root: HTMLElement): OrbitIcon[] {
  const sourceEls = Array.from(root.querySelectorAll<HTMLElement>('[data-icon-orbit-icon]'));
  const icons: OrbitIcon[] = [];

  sourceEls.forEach((sourceEl, index) => {
    const raw = sourceEl.getAttribute('data-ring');
    const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
    const ringIndex =
      Number.isInteger(parsed) && parsed >= 1 && parsed <= RING_MOTION.length
        ? parsed - 1
        : index % RING_MOTION.length;

    // Icon in eigenes Badge-Element wrappen, statt Webflow-Markup vorzuschreiben.
    const badge = document.createElement('div');
    badge.className = 'icon-orbit_icon';
    sourceEl.replaceWith(badge);
    badge.appendChild(sourceEl);

    icons.push({ el: badge, ringIndex, angle: 0 }); // Startwinkel folgt in distributeAngles()
  });

  distributeAngles(icons);
  return icons;
}

function distributeAngles(icons: OrbitIcon[]): void {
  RING_MOTION.forEach((_ring, ringIndex) => {
    const inRing = icons.filter((icon) => icon.ringIndex === ringIndex);
    // Icons gleichmäßig über den sichtbaren Bogen verteilen (nicht über den vollen Kreis).
    const step = ARC_SPAN / Math.max(inRing.length, 1);
    const phaseOffset = ringIndex * 0.3; // versetzt die Ringe leicht, damit Icons nicht senkrecht fluchten
    inRing.forEach((icon, i) => {
      icon.angle = wrapAngle(ARC_START + phaseOffset + step * i);
    });
  });
}

/** Hält einen Winkel innerhalb des sichtbaren Bogens [ARC_START, ARC_START + ARC_SPAN) - Ende erreicht -> Sprung an den Bogenanfang der Gegenseite. */
function wrapAngle(angle: number): number {
  const relative = angle - ARC_START;
  const wrapped = ((relative % ARC_SPAN) + ARC_SPAN) % ARC_SPAN;
  return ARC_START + wrapped;
}

/** Deckkraft eines Icons je nach Position im Bogen: blendet an beiden Enden weich statt hart abzuschneiden. */
function iconOpacity(angle: number): number {
  const t = (angle - ARC_START) / ARC_SPAN; // 0 = Bogenanfang, 1 = Bogenende
  if (t < EDGE_FADE) return t / EDGE_FADE;
  if (t > 1 - EDGE_FADE) return (1 - t) / EDGE_FADE;
  return 1;
}

function generateParticles(baseColor: RGB, accentColor: RGB): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < SPHERE.particleCount; i += 1) {
    // Fibonacci-Sphere: gleichmäßige Punktverteilung auf einer Kugeloberfläche.
    const t = i + 0.5;
    const phi = Math.acos(1 - (2 * t) / SPHERE.particleCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * t;

    const jitterAmount = 1 - Math.random() * SPHERE.jitter;
    const x = Math.sin(phi) * Math.cos(theta) * jitterAmount;
    const y = Math.cos(phi) * jitterAmount;
    const z = Math.sin(phi) * Math.sin(theta) * jitterAmount;

    const useAccent = Math.random() < SPHERE_COLORS.accentChance;
    const c = useAccent ? accentColor : baseColor;

    particles.push({
      x,
      y,
      z,
      size: SPHERE.minDotSize + Math.random() * (SPHERE.maxDotSize - SPHERE.minDotSize),
      rgb: `rgb(${c.r}, ${c.g}, ${c.b})`,
    });
  }

  return particles;
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function layoutRings(state: OrbitState): void {
  const scale = Math.min(state.width, state.height);
  const centerX = state.width / 2;
  const centerY = state.height * DOME_CENTER_Y_FACTOR;

  state.ringRadii.forEach((radiusFactor, i) => {
    const radius = radiusFactor * scale;
    const diameter = radius * 2;
    const el = state.ringEls[i];
    el.style.width = `${diameter}px`;
    el.style.height = `${diameter}px`;
    el.style.left = `${centerX - radius}px`;
    el.style.top = `${centerY - radius}px`;
  });
}

function layoutIcons(state: OrbitState): void {
  const scale = Math.min(state.width, state.height);
  const centerX = state.width / 2;
  const centerY = state.height * DOME_CENTER_Y_FACTOR;

  for (const icon of state.icons) {
    const radius = state.ringRadii[icon.ringIndex] * scale;
    const x = centerX + radius * Math.cos(icon.angle);
    const y = centerY + radius * Math.sin(icon.angle);
    icon.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    icon.el.style.opacity = String(iconOpacity(icon.angle));
  }
}

function drawSphere(state: OrbitState): void {
  const { ctx, width, height, particles, sphereRotation } = state;
  const scale = Math.min(width, height);
  const radius = state.sphereRadius * scale;
  const centerX = width / 2;
  const centerY = height * DOME_CENTER_Y_FACTOR;

  const cosR = Math.cos(sphereRotation);
  const sinR = Math.sin(sphereRotation);

  ctx.clearRect(0, 0, width, height);

  for (const p of particles) {
    // Rotation um die Y-Achse.
    const rx = p.x * cosR - p.z * sinR;
    const rz = p.x * sinR + p.z * cosR;

    const screenX = centerX + rx * radius;
    const screenY = centerY - p.y * radius; // Canvas-Y zeigt nach unten -> invertieren
    const depth = (rz + 1) / 2; // 0 = hinten, 1 = vorne

    ctx.globalAlpha = SPHERE.minAlpha + depth * (SPHERE.maxAlpha - SPHERE.minAlpha);
    ctx.fillStyle = p.rgb;
    const size = p.size * (0.55 + depth * 0.6);
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function measure(state: OrbitState): void {
  const rect = state.root.getBoundingClientRect();
  state.width = rect.width;
  state.height = rect.height;
  resizeCanvas(state.canvas, state.ctx, state.width, state.height);
  layoutRings(state);
  layoutIcons(state);
  drawSphere(state);
}

// ---- Component ----------------------------------------------------------

export function initIconOrbit(): void {
  const root = document.querySelector<HTMLElement>('[data-icon-orbit]');
  if (!root) return; // früh abbrechen, wenn die Seite dieses Element nicht hat

  // Schon initialisiert? (z.B. durch Hot-Reload bei npm run dev, oder init() lief doppelt)
  // Ohne diesen Guard würden Canvas/Ringe/Icon-Badges/Ticker-Callback bei jedem
  // erneuten Aufruf zusätzlich angelegt statt ersetzt - mit verschachtelten
  // .icon-orbit_icon-Duplikaten und parallel laufenden Ticker-Callbacks als Folge.
  if (root.querySelector(':scope > canvas.icon-orbit_canvas')) return;

  applyCssVarFromAttr(root, '--icon-orbit-icon-bg', 'data-icon-bg');
  applyCssVarFromAttr(root, '--icon-orbit-icon-border-color', 'data-icon-border-color');
  applyCssVarFromAttr(root, '--icon-orbit-ring-color', 'data-ring-color');

  const canvas = document.createElement('canvas');
  canvas.className = 'icon-orbit_canvas';
  root.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ringEls = createRingElements(root);
  const icons = collectIcons(root);

  const sphereBaseColor = readColorAttr(root, 'data-sphere-color', SPHERE_COLORS.base);
  const sphereAccentColor = readColorAttr(root, 'data-sphere-accent-color', SPHERE_COLORS.accent);
  const particles = generateParticles(sphereBaseColor, sphereAccentColor);

  const sphereRadius = readNumberAttr(root, 'data-sphere-radius', DEFAULTS.sphereRadius);
  const firstRingGap = readNumberAttr(root, 'data-first-ring-gap', DEFAULTS.firstRingGap);
  const ringGap = readNumberAttr(root, 'data-ring-gap', DEFAULTS.ringGap);
  const ringRadii = computeRingRadii(sphereRadius, firstRingGap, ringGap);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state: OrbitState = {
    root,
    canvas,
    ctx,
    ringEls,
    icons,
    particles,
    width: 0,
    height: 0,
    sphereRotation: 0,
    motionScale: prefersReducedMotion ? 0 : 1,
    sphereRadius,
    ringRadii,
  };

  measure(state);

  const handleTick = (_time: number, deltaTime: number): void => {
    const dt = (deltaTime / 1000) * state.motionScale;
    if (dt === 0) return;

    state.sphereRotation += SPHERE.rotationSpeed * dt;
    for (const icon of state.icons) {
      icon.angle = wrapAngle(icon.angle + RING_MOTION[icon.ringIndex].speed * dt);
    }

    layoutIcons(state);
    drawSphere(state);
  };

  gsap.ticker.add(handleTick);

  const resizeObserver = new ResizeObserver(() => measure(state));
  resizeObserver.observe(root);
}
