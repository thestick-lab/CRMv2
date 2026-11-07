import { todayInSouthAfrica, easterSunday } from 'fdoncall-practice/domain/dates';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';

export default function App() {
  const today = todayInSouthAfrica();
  const easter2027 = easterSunday(2027);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Geist, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #262626', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: '2.5rem', margin: 0, color: '#ebebeb' }}>
          FD on Call <span style={{ color: '#c4161c' }}>CRM</span>
        </h1>
        <p style={{ color: '#888888', margin: '0.25rem 0 0 0' }}>
          High-velocity South African practice operating system
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#181818', border: '1px solid #262626', borderRadius: '6px', padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#888888', fontSize: '0.85rem', textTransform: 'uppercase' }}>
            Domain Engine Status
          </h3>
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#4ade80' }}>
            Connected &amp; Verified
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#888888' }}>
            Date SA: <code style={{ fontFamily: 'Geist Mono, monospace', color: '#ebebeb' }}>{today}</code>
          </p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#888888' }}>
            Computus Easter 2027: <code style={{ fontFamily: 'Geist Mono, monospace', color: '#ebebeb' }}>{easter2027}</code>
          </p>
        </div>

        <div style={{ background: '#181818', border: '1px solid #262626', borderRadius: '6px', padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#888888', fontSize: '0.85rem', textTransform: 'uppercase' }}>
            Seeded Practice Data
          </h3>
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#ebebeb' }}>
            {CLIENTS.length} Clients Loaded
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#888888' }}>
            {STAFF.length} Practice Staff Members
          </p>
        </div>
      </section>
    </div>
  );
}
