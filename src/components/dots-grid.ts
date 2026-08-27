type DotShape = 'circle' | 'square';
type RGBA = [number, number, number, number];

// Werte zum "live rumspielen" (Aussehen & Interaktion) — zentral hier oben.
const DOTS_GRID_SETTINGS: {
  gap: string;
  dotSize: string;
  shape: DotShape;
  colorInactive: string;
  colorActive: string;
  maxScale: number;
  pressScale: number;
  hoverRadius: number;
  easeDuration: number;
} = {
  gap: '1em', // Abstand zwischen den Punkten
  dotSize: '0.125em', // Standardgröße eines Punkts
  shape: 'circle', // 'circle' oder 'square'
  colorInactive: 'rgba(0, 0, 0, 0.2)', // Standardfarbe inaktiver Punkte
  colorActive: 'rgba(0, 0, 0, 0.75)', // Farbe bei maximalem Hover-Einfluss
  maxScale: 1.75, // maximale Skalierung eines Punkts beim Hover
  pressScale: 1.5, // zusätzlicher Skalierungsfaktor beim Klicken/Halten
  hoverRadius: 12, // Radius (in Grid-Spacing-Einheiten) um den Pointer
  easeDuration: 0.5, // Trägheit des Easings / Pointer-Nachlaufs (Sekunden)
};

interface EaseState {
  value: number;
  from: number;
  to: number;
  start: number;
}

interface PointerState {
  x: number;
  y: number;
  cx: number;
  cy: number;
  active: boolean;
}

interface CanvasState {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  visible: boolean;
  inactive: RGBA;
  active: RGBA;
}

export function initDotsGrid(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-dots-canvas-init]');
  if (!elements.length) return; // früh abbrechen, wenn die Seite dieses Element nicht hat

  const hasPointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pointer: PointerState = { x: 0, y: 0, cx: 0, cy: 0, active: false };
  const hover: EaseState = { value: 0, from: 0, to: 0, start: 0 };
  const press: EaseState = { value: 0, from: 0, to: 0, start: 0 };
  const canvases: CanvasState[] = [];

  let dpr: number;
  let size: number;
  let spacing: number;
  let radius: number;
  let raf: number | null = null;
  let lastTime = performance.now();

  function toPx(value: string, element: HTMLElement): number {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;width:${value};`;
    element.appendChild(probe);
    const px = probe.getBoundingClientRect().width;
    probe.remove();
    return px;
  }

  function parseColor(color: string, element: HTMLElement): RGBA {
    const probe = document.createElement('span');
    probe.style.color = color;
    element.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [0, 0, 0, 1];

    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  }

  function mixColor(a: RGBA, b: RGBA, p: number): string {
    const mixed = a.map((v, i) => v + (b[i] - v) * p);
    return `rgba(${mixed.join(',')})`;
  }

  function setEase(state: EaseState, to: number): void {
    Object.assign(state, { from: state.value, to, start: performance.now() });
  }

  function updateEase(state: EaseState, time: number): void {
    if (!DOTS_GRID_SETTINGS.easeDuration) {
      state.value = state.to;
      return;
    }
    const p = Math.min(
      Math.max((time - state.start) / (DOTS_GRID_SETTINGS.easeDuration * 1000), 0),
      1
    );
    state.value = state.from + (state.to - state.from) * (1 - Math.pow(1 - p, 4));
  }

  elements.forEach((element) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    });

    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';

    element.prepend(canvas);
    canvases.push({
      element,
      canvas,
      ctx,
      width: 0,
      height: 0,
      visible: false,
      inactive: parseColor(
        element.getAttribute('data-dots-color-inactive') || DOTS_GRID_SETTINGS.colorInactive,
        element
      ),
      active: parseColor(
        element.getAttribute('data-dots-color-active') || DOTS_GRID_SETTINGS.colorActive,
        element
      ),
    });
  });

  function pointerInside(): boolean {
    return canvases.some(({ element }) => {
      const r = element.getBoundingClientRect();
      return (
        pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom
      );
    });
  }

  function render(state: CanvasState, origin: DOMRect): void {
    const rect = state.element.getBoundingClientRect();
    const left = rect.left - origin.left;
    const top = rect.top - origin.top;
    const px = pointer.cx - origin.left;
    const py = pointer.cy - origin.top;
    const maxScale =
      DOTS_GRID_SETTINGS.maxScale * (1 + (DOTS_GRID_SETTINGS.pressScale - 1) * press.value);

    state.ctx.clearRect(0, 0, state.width, state.height);

    const colStart = Math.floor(left / spacing);
    const colEnd = Math.ceil((left + state.width) / spacing);
    const rowStart = Math.floor(top / spacing);
    const rowEnd = Math.ceil((top + state.height) / spacing);

    for (let row = rowStart; row <= rowEnd; row++) {
      const gy = row * spacing;
      const y = gy - top;

      for (let col = colStart; col <= colEnd; col++) {
        const gx = col * spacing;
        const x = gx - left;
        const influence =
          hasPointer && hover.value
            ? Math.max(0, 1 - Math.hypot(gx - px, gy - py) / radius) * hover.value
            : 0;
        const currentSize = size * (1 + (maxScale - 1) * influence);

        state.ctx.fillStyle = mixColor(state.inactive, state.active, influence);

        if (DOTS_GRID_SETTINGS.shape === 'square') {
          state.ctx.fillRect(x - currentSize / 2, y - currentSize / 2, currentSize, currentSize);
        } else {
          state.ctx.beginPath();
          state.ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
          state.ctx.fill();
        }
      }
    }
  }

  function renderAll(visibleOnly = false): void {
    const origin = elements[0].getBoundingClientRect();
    canvases.forEach((state) => {
      if (!visibleOnly || state.visible) render(state, origin);
    });
  }

  function tick(time: number): void {
    raf = null;
    if (!canvases.some((state) => state.visible)) return;

    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    updateEase(hover, time);
    updateEase(press, time);

    if (!DOTS_GRID_SETTINGS.easeDuration) {
      pointer.cx = pointer.x;
      pointer.cy = pointer.y;
    } else {
      const strength = 1 - Math.exp((-delta * 6) / DOTS_GRID_SETTINGS.easeDuration);
      pointer.cx += (pointer.x - pointer.cx) * strength;
      pointer.cy += (pointer.y - pointer.cy) * strength;
    }

    renderAll(true);
    raf = requestAnimationFrame(tick);
  }

  function start(): void {
    if (hasPointer && !raf && canvases.some((state) => state.visible)) {
      lastTime = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function resize(): void {
    dpr = Math.min(devicePixelRatio || 1, 2);
    size = toPx(DOTS_GRID_SETTINGS.dotSize, elements[0]);
    spacing = size + toPx(DOTS_GRID_SETTINGS.gap, elements[0]);
    radius = spacing * DOTS_GRID_SETTINGS.hoverRadius;

    canvases.forEach((state) => {
      const rect = state.element.getBoundingClientRect();
      state.width = rect.width;
      state.height = rect.height;
      state.canvas.width = Math.round(rect.width * dpr);
      state.canvas.height = Math.round(rect.height * dpr);
      state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    renderAll();
    start();
  }

  if (hasPointer) {
    window.addEventListener('pointermove', (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;

      const inside = pointerInside();

      if (inside !== pointer.active) {
        pointer.active = inside;
        setEase(hover, inside ? 1 : 0);

        if (inside) {
          pointer.cx = pointer.x;
          pointer.cy = pointer.y;
        } else {
          setEase(press, 0);
        }
      }

      start();
    });

    window.addEventListener('pointerdown', () => {
      if (pointer.active) setEase(press, 1);
    });
    window.addEventListener('pointerup', () => setEase(press, 0));
  }

  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const state = canvases.find((s) => s.element === entry.target);
      if (state) state.visible = entry.isIntersecting;
    });

    if (hasPointer) start();
    else renderAll(true);
  });

  const resizeObserver = new ResizeObserver(resize);

  elements.forEach((element) => {
    intersectionObserver.observe(element);
    resizeObserver.observe(element);
  });

  window.addEventListener('resize', resize);
  resize();
}
