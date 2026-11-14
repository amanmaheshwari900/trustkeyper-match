// Routes: #/s/… is the tenant's page (no sign-in); everything else is the desk.

import { addScreen, bookingScreen, homeScreen, homesScreen, moreScreen, setup, signIn, tenantScreen, tenantsScreen, todayScreen, visitsScreen } from './desk.js';
import { store } from './store.js';
import { renderShortlist } from './tenant.js';

const app = document.getElementById('app');
let booting = true;

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query || '') };
}

async function route() {
  const { parts, params } = parse();
  window.scrollTo(0, 0);

  // Tenant pages: everything is in the link.
  if (parts[0] === 's' && parts[1]) {
    document.title = 'Homes picked for you · TrustKeyper';
    document.body.dataset.mode = 'tenant';
    return renderShortlist(app, parts[1], parts.slice(2).join('/'));
  }

  document.body.dataset.mode = 'desk';
  document.title = 'TrustKeyper Match';
  if (!store.key) {
    const saved = store.savedPass();
    if (saved && booting) {
      app.innerHTML = '<div class="loading"><img src="trustkeyper-mark.png" alt=""><span>Opening the desk…</span></div>';
      try {
        await store.signIn(saved, true);
      } catch {
        store.signOut();
      }
    }
    booting = false;
    if (!store.key) return signIn(app, route);
  }
  if (!store.local.settings.name || !store.local.settings.phone) return setup(app, route);

  switch (parts[0]) {
    case 'b':
      return bookingScreen(app, parts[1]);
    case 'tenants':
      return tenantsScreen(app, params);
    case 'tenant':
      return tenantScreen(app, decodeURIComponent(parts[1]));
    case 'homes':
      return homesScreen(app);
    case 'home':
      return homeScreen(app, decodeURIComponent(parts[1]));
    case 'visits':
      return visitsScreen(app);
    case 'more':
      return moreScreen(app);
    case 'add':
      return addScreen(app, params);
    default:
      return todayScreen(app);
  }
}

// Redraw the open desk screen when data changes (refresh, edits).
store.on(() => {
  if (document.body.dataset.mode === 'desk' && store.key) route();
});
window.addEventListener('hashchange', route);
route();
