import { initGsapCore, revealAfterSetup, initScrollRefreshFixes } from './global';
import { initGlobe } from './components/globe';
import { initHubFlow } from './components/hub-flow';
import { initFooterRevealCurve } from './components/footer-reveal-curve';

function init(): void {
  initGsapCore();

  initGlobe();
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
