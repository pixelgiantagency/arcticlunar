import { initGsapCore, revealAfterSetup, initScrollRefreshFixes } from './global';
import { initDotsGrid } from './components/dots-grid';
import { initHeroIntro } from './components/hero-intro';
import { initGlobe } from './components/globe';
import { initCodeShowcase } from './components/code-showcase';
import { initHubFlow } from './components/hub-flow';
import { initIconOrbit } from './components/icon-orbit';
import { initFooterRevealCurve } from './components/footer-reveal-curve';

function init(): void {
  initGsapCore();

  initDotsGrid();
  initHeroIntro();
  initGlobe();
  initCodeShowcase();
  initHubFlow();
  initIconOrbit();
  initFooterRevealCurve();

  initScrollRefreshFixes();

  revealAfterSetup(); // Immer als letzter Aufruf in init()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
