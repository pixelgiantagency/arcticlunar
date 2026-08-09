import { initGsapCore, revealAfterSetup, initScrollRefreshFixes } from './global';
import { initExample } from './components/example';

function init(): void {
  initGsapCore();

  initExample();
  // Neue Components hier importieren & aufrufen

  initScrollRefreshFixes();

  revealAfterSetup(); // Immer als letzter Aufruf in init()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
