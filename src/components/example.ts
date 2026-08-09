// Beispiel-Component - zeigt den Standard-Aufbau für neue, seitenspezifische Funktionen.
// Kopieren, umbenennen, Logik ersetzen. Diese Datei selbst raus, sobald echte Components existieren.

export function initExample(): void {
  const elements = document.querySelectorAll<HTMLElement>("[data-example]");
  if (elements.length === 0) return;

  elements.forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 20,
      duration: 0.6,
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });
  });
}
