import { initGsapCore, revealAfterSetup, initScrollRefreshFixes } from './global';
import { initGlobe } from './components/globe';

function init(): void {
  initGsapCore();

  initGlobe();

  initScrollRefreshFixes();

  revealAfterSetup(); // Immer als letzter Aufruf in init()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
