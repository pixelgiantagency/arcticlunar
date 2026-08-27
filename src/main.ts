import { initGsapCore, revealAfterSetup, initScrollRefreshFixes } from './global';
import { initDotsGrid } from './components/dots-grid';
import { initGlobe } from './components/globe';
import { initCodeShowcase } from './components/code-showcase';
import { initHubFlow } from './components/hub-flow';
import { initFooterRevealCurve } from './components/footer-reveal-curve';

function init(): void {
  initGsapCore();

  initDotsGrid();
  initGlobe();
  initCodeShowcase();
  initHubFlow();
  initFooterRevealCurve();

  initScrollRefreshFixes();

  revealAfterSetup(); // Immer als letzter Aufruf in init()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
