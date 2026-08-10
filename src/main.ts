import { initGsapCore, revealAfterSetup, initScrollRefreshFixes } from './global';
import { initGlobe } from './components/globe';
import { initHubFlow } from './components/hub-flow';

function init(): void {
  initGsapCore();

  initGlobe();
  initHubFlow();

  initScrollRefreshFixes();

  revealAfterSetup(); // Immer als letzter Aufruf in init()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
