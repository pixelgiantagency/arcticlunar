// src/components/globe.ts
// CDN-Globe (1:1 nach cobe.vercel.app, CDN-Showcase)
// Erwartet in Webflow: ein Div mit dem Custom Attribute `data-globe`.
// Zugehöriges CSS liegt in src/styles/globe.css (über src/main.css importiert).

import createGlobe, { type Marker, type Arc } from 'cobe';

/* =====================================================================
   FARBEN & TRANSPARENZ - hier zentral anpassen. cssColor() akzeptiert
   jedes gültige CSS-Farbformat (oklch, hsl, rgb, Named Colors, ...) -
   der Browser selbst rechnet das ins 0-1-RGB-Format um, das cobe
   erwartet. Siehe Chat-Erklärung.
   ===================================================================== */
function cssColor(value: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [0, 0, 0];
  ctx.fillStyle = value; // Browser parst z.B. oklch(...), hsl(...), rgb(...)
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

const GLOBE_COLORS = {
  base: cssColor('rgb(21, 24, 25)'), // baseColor (Globus + Punkte)
  marker: cssColor('rgb(0, 0, 0)'), // markerColor (unsichtbarer Anker-Marker)
  arc: cssColor('rgb(255, 255, 255)'), // arcColor (Verbindungslinien)
  glow: cssColor('rgb(28, 33, 34)'), // glowColor (Schimmer am Rand)
  opacity: 1, // Transparenz des GESAMTEN Globus (0 = unsichtbar, 1 = voll deckend)
  dark: 0.6, // 0 = dunkle Punkte auf hellem Grund, 1 = helle Punkte auf dunklem Grund,
  // Zwischenwerte möglich - bei dunklem "base" i.d.R. Richtung 1
};

/* =====================================================================
   WEITERE OPTIK-EINSTELLUNGEN - alles, was nicht Farbe ist, aber das
   Aussehen der Kugel/Linien/Punkte beeinflusst.
   ===================================================================== */
const SETTINGS = {
  theta: 0.2, // Kipp-Winkel der Kugel (vertikal, -π/2 bis π/2)
  diffuse: 1.5, // Lichtintensität/Kontrast der Beleuchtung
  mapSamples: 16000, // Anzahl der Punkte insgesamt (mehr = feinere "Auflösung")
  mapBrightness: 12, // wie stark die Punkte hervortreten
  mapBaseBrightness: 0, // Grund-Helligkeit der "leeren" Bereiche zwischen den Punkten
  markerSize: 0.012, // Größe der (unsichtbaren) Anker-Marker
  markerElevation: 0.02, // Höhe der Marker über der Oberfläche (beeinflusst Pin-Position)
  arcWidth: 0.5, // Dicke der Verbindungslinien
  arcHeight: 0.25, // wie stark die Linien über die Kugel gewölbt sind
  scale: 1, // Zoom-Faktor der ganzen Kugel
  offset: [0, 0] as [number, number], // Pixel-Verschiebung der Kugel vom Zentrum [x, y]
};

/* =====================================================================
   DATEN - 1:1 aus cobe.vercel.app / website/app/showcases-data.ts
   (cdnMarkers, cdnArcs)
   ===================================================================== */
interface GlobeMarker {
  id: string;
  location: [number, number];
  region: string;
}

const MARKERS: GlobeMarker[] = [
  { id: 'cdn-iad', location: [38.95, -77.45], region: 'iad1' },
  { id: 'cdn-sfo', location: [37.62, -122.38], region: 'sfo1' },
  { id: 'cdn-cdg', location: [49.01, 2.55], region: 'cdg1' },
  { id: 'cdn-hnd', location: [35.55, 139.78], region: 'hnd1' },
  { id: 'cdn-syd', location: [-33.95, 151.18], region: 'syd1' },
  { id: 'cdn-gru', location: [-23.43, -46.47], region: 'gru1' },
  { id: 'cdn-sin', location: [1.36, 103.99], region: 'sin1' },
  { id: 'cdn-arn', location: [59.65, 17.93], region: 'arn1' },
  { id: 'cdn-dub', location: [53.43, -6.25], region: 'dub1' },
  { id: 'cdn-bom', location: [19.09, 72.87], region: 'bom1' },
];

interface GlobeArc {
  id: string;
  from: [number, number];
  to: [number, number];
  value: number;
}

// Startwerte + Reihenfolge exakt wie im Original (cdnTraffic init)
const ARCS: GlobeArc[] = [
  { id: 'cdn-arc-1', from: [38.95, -77.45], to: [49.01, 2.55], value: 420 }, // IAD -> CDG
  { id: 'cdn-arc-2', from: [37.62, -122.38], to: [35.55, 139.78], value: 380 }, // SFO -> HND
  { id: 'cdn-arc-3', from: [49.01, 2.55], to: [1.36, 103.99], value: 290 }, // CDG -> SIN
  { id: 'cdn-arc-4', from: [38.95, -77.45], to: [-23.43, -46.47], value: 185 }, // IAD -> GRU
  { id: 'cdn-arc-5', from: [35.55, 139.78], to: [-33.95, 151.18], value: 156 }, // HND -> SYD
  { id: 'cdn-arc-6', from: [49.01, 2.55], to: [19.09, 72.87], value: 134 }, // CDG -> BOM
];

/* =====================================================================
   INIT - Standard-Pattern des Templates: findet das Ziel-Element via
   data-Attribut, bricht früh ab, wenn es auf dieser Seite nicht existiert.
   ===================================================================== */
export function initGlobe(): void {
  const root = document.querySelector<HTMLElement>('[data-globe]');
  if (!root) return;

  root.classList.add('alx-globe');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'CDN Globe: live Traffic zwischen Edge-Standorten');
  root.appendChild(canvas);

  /* ---- DOM-Overlay: Pins (Pyramide + Region-Code) + Traffic-Badges,
     per offiziellem CSS-Anchor-Mechanismus an Marker/Arcs angedockt ---- */
  MARKERS.forEach((m) => {
    const pin = document.createElement('div');
    pin.className = 'alx-globe-pin';
    pin.style.setProperty('position-anchor', `--cobe-${m.id}`);
    pin.style.opacity = `var(--cobe-visible-${m.id}, 0)`;
    pin.style.filter = `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`;
    pin.innerHTML =
      '<div class="alx-globe-pyramid">' +
      '<div class="alx-globe-pyramid-face"></div>'.repeat(4) +
      '</div>' +
      `<span class="alx-globe-label">${m.region}</span>`;
    root.appendChild(pin);
  });

  const badgeEls = ARCS.map((a) => {
    const badge = document.createElement('div');
    badge.className = 'alx-globe-arc-label';
    badge.style.setProperty('position-anchor', `--cobe-arc-${a.id}`);
    badge.style.opacity = `var(--cobe-visible-arc-${a.id}, 0)`;
    badge.style.filter = `blur(calc((1 - var(--cobe-visible-arc-${a.id}, 0)) * 8px))`;
    badge.textContent = `${a.value}k req/s`;
    root.appendChild(badge);
    return { el: badge, data: a };
  });

  // Live-Traffic: exakt dieselbe Logik wie das Original (alle 250ms ±10, nie unter 50)
  setInterval(() => {
    badgeEls.forEach(({ el, data }) => {
      data.value = Math.max(50, data.value + Math.floor(Math.random() * 21) - 10);
      el.textContent = `${data.value}k req/s`;
    });
  }, 250);

  /* ---- Globus - createGlobe exakt mit den CDN-Werten ---- */
  const width = canvas.offsetWidth;
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 640 ? 1.8 : 2);

  const globeMarkers: Marker[] = MARKERS.map((m) => ({
    location: m.location,
    size: SETTINGS.markerSize,
    id: m.id,
  }));
  const globeArcs: Arc[] = ARCS.map((a) => ({ from: a.from, to: a.to, id: a.id }));

  const globe = createGlobe(canvas, {
    devicePixelRatio: dpr,
    width,
    height: width,
    phi: 0,
    theta: SETTINGS.theta,
    dark: GLOBE_COLORS.dark,
    diffuse: SETTINGS.diffuse,
    mapSamples: SETTINGS.mapSamples,
    mapBrightness: SETTINGS.mapBrightness,
    mapBaseBrightness: SETTINGS.mapBaseBrightness,
    baseColor: GLOBE_COLORS.base,
    markerColor: GLOBE_COLORS.marker,
    glowColor: GLOBE_COLORS.glow,
    markerElevation: SETTINGS.markerElevation,
    markers: globeMarkers,
    arcs: globeArcs,
    arcColor: GLOBE_COLORS.arc,
    arcWidth: SETTINGS.arcWidth,
    arcHeight: SETTINGS.arcHeight,
    scale: SETTINGS.scale,
    offset: SETTINGS.offset,
    opacity: GLOBE_COLORS.opacity,
  });

  /* ---- Drag + Momentum - exakt aus page.tsx (Showcases-Komponente)
     übernommen: gleiche Divisoren, gleiche Dämpfung, gleiche Theta-Grenzen. ---- */
  let phi = 0;
  let phiOffset = 0;
  let thetaOffset = 0;
  let pointerInteracting: { x: number; y: number } | null = null;
  let lastPointer: { x: number; y: number; t: number } | null = null;
  let dragOffset = { phi: 0, theta: 0 };
  let velocity = { phi: 0, theta: 0 };
  let isPaused = false;
  let speed = 1;

  function handlePointerDown(e: PointerEvent): void {
    pointerInteracting = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
    isPaused = true;
  }

  function handlePointerMove(e: PointerEvent): void {
    if (pointerInteracting === null) return;
    const deltaX = e.clientX - pointerInteracting.x;
    const deltaY = e.clientY - pointerInteracting.y;
    dragOffset = { phi: deltaX / 300, theta: deltaY / 1000 };

    const now = Date.now();
    if (lastPointer) {
      const dt = Math.max(now - lastPointer.t, 1);
      const maxVelocity = 0.15;
      velocity = {
        phi: Math.max(
          -maxVelocity,
          Math.min(maxVelocity, ((e.clientX - lastPointer.x) / dt) * 0.3)
        ),
        theta: Math.max(
          -maxVelocity,
          Math.min(maxVelocity, ((e.clientY - lastPointer.y) / dt) * 0.08)
        ),
      };
    }
    lastPointer = { x: e.clientX, y: e.clientY, t: now };
  }

  function handlePointerUp(): void {
    if (pointerInteracting !== null) {
      phiOffset += dragOffset.phi;
      thetaOffset += dragOffset.theta;
      dragOffset = { phi: 0, theta: 0 };
      lastPointer = null;
    }
    pointerInteracting = null;
    canvas.style.cursor = 'grab';
    isPaused = false;
  }

  canvas.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  canvas.addEventListener('pointerenter', () => {
    speed = 0.8;
  });
  canvas.addEventListener('pointerleave', () => {
    speed = 1;
  });

  function animate(): void {
    if (!isPaused) {
      phi += 0.003 * speed;

      if (Math.abs(velocity.phi) > 0.0001 || Math.abs(velocity.theta) > 0.0001) {
        phiOffset += velocity.phi;
        thetaOffset += velocity.theta;
        velocity.phi *= 0.95;
        velocity.theta *= 0.95;
      }

      const thetaMin = -0.4;
      const thetaMax = 0.4;
      if (thetaOffset < thetaMin) {
        thetaOffset += (thetaMin - thetaOffset) * 0.1;
      } else if (thetaOffset > thetaMax) {
        thetaOffset += (thetaMax - thetaOffset) * 0.1;
      }
    }

    globe.update({
      phi: phi + phiOffset + dragOffset.phi,
      theta: SETTINGS.theta + thetaOffset + dragOffset.theta,
    });
    requestAnimationFrame(animate);
  }
  animate();

  setTimeout(() => {
    canvas.style.opacity = '1';
  });
}
