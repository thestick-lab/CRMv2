import { useEffect, useState } from 'react';
import { formatDateWithDay, todayInSouthAfrica } from '../domain/dates';
import { ClientPage } from './ClientPage';
import { Clients } from './Clients';
import { Deadlines } from './Deadlines';
import { EstimateView } from './Estimate';
import { useModel } from './model';
import { Rules } from './Rules';

type Route = { view: 'deadlines' } | { view: 'clients' } | { view: 'client'; code: string } | { view: 'rules' } | { view: 'estimate'; code?: string };

function parse(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'clients') return { view: 'clients' };
  if (h === 'rules') return { view: 'rules' };
  if (h === 'estimate') return { view: 'estimate' };
  if (h.startsWith('estimate-')) return { view: 'estimate', code: h.slice('estimate-'.length) };
  if (h.startsWith('client-')) return { view: 'client', code: h.slice('client-'.length) };
  return { view: 'deadlines' };
}

export function App() {
  const [route, setRoute] = useState(parse(location.hash) as Route);
  const asOf = todayInSouthAfrica();
  const model = useModel(asOf);

  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const tab = route.view === 'client' || (route.view === 'estimate' && route.code) ? 'clients' : route.view;

  return (
    <div className="app">
      <header className="top">
        <div className="top-inner">
          <a className="brand" href="#deadlines" aria-label="FD on Call practice system, deadlines">
            <span className="mark" aria-hidden="true">
              FD
            </span>
            <span className="brand-text">
              <span className="brand-name">FD on Call</span>
              <span className="brand-sub">Practice system</span>
            </span>
          </a>
          <nav className="nav" aria-label="Main">
            <a href="#deadlines" aria-current={tab === 'deadlines' ? 'page' : undefined}>
              Deadlines
            </a>
            <a href="#clients" aria-current={tab === 'clients' ? 'page' : undefined}>
              Clients
            </a>
            <a href="#estimate" aria-current={tab === 'estimate' ? 'page' : undefined}>
              New client estimate
            </a>
            <a href="#rules" aria-current={tab === 'rules' ? 'page' : undefined}>
              Services and rules
            </a>
          </nav>
        </div>
      </header>

      <div className="banner" role="note">
        <div className="banner-inner">
          <span className="pill">Prototype</span>
          <span>
            {model.clients.length} dummy clients, deadlines as at <strong>{formatDateWithDay(asOf)}</strong>. Changes you make stay until you
            reload the page.
          </span>
          {model.editCount > 0 && (
            <button type="button" className="link-btn" onClick={model.reset}>
              Undo all changes
            </button>
          )}
        </div>
      </div>

      <main className="main">
        {route.view === 'deadlines' && <Deadlines model={model} />}
        {route.view === 'clients' && <Clients model={model} />}
        {route.view === 'client' && <ClientPage code={route.code} model={model} />}
        {route.view === 'rules' && <Rules model={model} />}
        {route.view === 'estimate' && <EstimateView key={route.code ?? 'new'} model={model} clientCode={route.code} />}
      </main>
    </div>
  );
}
