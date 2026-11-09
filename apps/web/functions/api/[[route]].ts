import { Hono } from 'hono';
import { betterAuth } from 'better-auth';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../src/db/auth-schema';

declare global {
  interface D1Database {
    prepare(query: string): {
      bind(...args: unknown[]): {
        first<T = unknown>(): Promise<T>;
        run(): Promise<unknown>;
        all<T = unknown>(): Promise<{ results: T[] }>;
      };
      first<T = unknown>(): Promise<T>;
      run(): Promise<unknown>;
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
  }
}

export const DEMO_PASSWORD = 'FDonCall2026!';

export const SEEDED_STAFF_ACCOUNTS = [
  { id: 'erik', name: 'Erik', email: 'erik@fdoncall.co.za', role: 'Partner', kind: 'employee' },
  { id: 'wouter', name: 'Wouter', email: 'wouter@fdoncall.co.za', role: 'Partner', kind: 'employee' },
  { id: 'andre', name: 'André', email: 'andre@fdoncall.co.za', role: 'Accountant', kind: 'employee' },
  { id: 'mia', name: 'Mia', email: 'mia@fdoncall.co.za', role: 'Team member', kind: 'employee' },
  { id: 'willem', name: 'Willem', email: 'willem@fdoncall.co.za', role: 'Team member', kind: 'employee' },
  { id: 'nikita', name: 'Nikita', email: 'nikita@fdoncall.co.za', role: 'Compliance Officer', kind: 'employee' },
  { id: 'lungani', name: 'Lungani', email: 'lungani@fdoncall.co.za', role: 'Team member', kind: 'employee' },
  { id: 'hannes', name: 'Hannes', email: 'hannes@fdoncall.co.za', role: 'Subcontractor', kind: 'subcontractor' },
  { id: 'caroline', name: 'Caroline', email: 'caroline@fdoncall.co.za', role: 'Subcontractor', kind: 'subcontractor' },
  { id: 'support-tech', name: 'Support Tech', email: 'support.tech@fdoncall.co.za', role: 'Support Tech', kind: 'employee' },
];

const app = new Hono<{ Bindings: { DB: D1Database } }>();

function getAuth(d1: D1Database) {
  const db = drizzle(d1, { schema });
  return betterAuth({
    database: {
      db,
      type: 'sqlite',
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    user: {
      additionalFields: {
        role: { type: 'string', required: true, defaultValue: 'Accountant' },
        staffId: { type: 'string', required: true, defaultValue: 'accountant' },
        kind: { type: 'string', required: true, defaultValue: 'employee' },
      },
    },
  });
}

// Ensure seeded staff exist on API calls
async function ensureSeeded(d1: D1Database) {
  try {
    const auth = getAuth(d1);
    const res = await d1.prepare('SELECT COUNT(*) as cnt FROM user').first<{ cnt: number }>();
    if (!res || res.cnt === 0) {
      for (const s of SEEDED_STAFF_ACCOUNTS) {
        try {
          await auth.api.signUpEmail({
            body: {
              email: s.email,
              password: DEMO_PASSWORD,
              name: s.name,
              role: s.role,
              staffId: s.id,
              kind: s.kind,
            } as unknown as {
              email: string;
              password: string;
              name: string;
              role: string;
              staffId: string;
              kind: string;
            },
          });
        } catch (e) {
          // ignore if already exists
        }
      }
    }
  } catch (e) {
    // ignore seeding error if D1 binding is missing in local fallback
  }
}

app.all('/api/auth/*', async (c) => {
  if (c.env && c.env.DB) {
    await ensureSeeded(c.env.DB);
    const auth = getAuth(c.env.DB);
    return auth.handler(c.req.raw);
  }
  return c.text('Cloudflare D1 DB binding missing', 500);
});

export default app;
