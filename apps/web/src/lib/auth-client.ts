import { SEEDED_STAFF_ACCOUNTS, DEMO_PASSWORD } from '../../functions/api/[[route]]';

export { DEMO_PASSWORD, SEEDED_STAFF_ACCOUNTS };

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role:
    | 'Partner'
    | 'Compliance Officer'
    | 'Accountant'
    | 'Team member'
    | 'Subcontractor'
    | 'Support Tech';
  kind: 'employee' | 'subcontractor';
}

export function authenticateStaffCredentials(
  email: string,
  pass: string
): { ok: boolean; user?: AuthenticatedUser; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const staff = SEEDED_STAFF_ACCOUNTS.find((s) => s.email.toLowerCase() === normalizedEmail);
  if (!staff) {
    return { ok: false, error: 'Staff account not found' };
  }
  if (pass !== DEMO_PASSWORD) {
    return { ok: false, error: 'Invalid demo password' };
  }
  return {
    ok: true,
    user: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role as AuthenticatedUser['role'],
      kind: staff.kind as AuthenticatedUser['kind'],
    },
  };
}

export async function signInWithCredentials(
  email: string,
  pass: string
): Promise<{ ok: boolean; user?: AuthenticatedUser; error?: string }> {
  const localCheck = authenticateStaffCredentials(email, pass);
  if (localCheck.ok) {
    return localCheck;
  }
  try {
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      if (data && typeof data === 'object' && 'user' in data) {
        const rawUser = data.user;
        if (rawUser && typeof rawUser === 'object') {
          const staffId = 'staffId' in rawUser && typeof rawUser.staffId === 'string' ? rawUser.staffId : 'erik';
          const name = 'name' in rawUser && typeof rawUser.name === 'string' ? rawUser.name : 'Erik';
          const userEmail = 'email' in rawUser && typeof rawUser.email === 'string' ? rawUser.email : email;
          const roleStr = 'role' in rawUser && typeof rawUser.role === 'string' ? rawUser.role : 'Partner';
          const kindStr = 'kind' in rawUser && typeof rawUser.kind === 'string' ? rawUser.kind : 'employee';

          return {
            ok: true,
            user: {
              id: staffId,
              name,
              email: userEmail,
              role: roleStr as AuthenticatedUser['role'],
              kind: kindStr as AuthenticatedUser['kind'],
            },
          };
        }
      }
    }
    return { ok: false, error: 'Authentication failed' };
  } catch (err) {
    return localCheck;
  }
}
