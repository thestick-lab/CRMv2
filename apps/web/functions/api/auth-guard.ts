/**
 * Guard for the better-auth HTTP routes.
 *
 * `getAuth()` declares `role`, `staffId` and `kind` as better-auth
 * `additionalFields`, which means a sign-up or profile-update request body can
 * carry them. Left alone, any caller who can reach the deployed function could
 * `POST /api/auth/sign-up/email` with `{ "role": "Partner" }` and be granted the
 * practice's highest privileges — the whole permission matrix downstream of
 * `currentUser.role` would then trust a role the user chose for themselves.
 *
 * Accounts in this product come from `SEEDED_STAFF_ACCOUNTS`, created
 * server-side by `ensureSeeded()` through `auth.api.signUpEmail()` (a direct
 * call that never passes through these HTTP routes), or from the app's own
 * invite flow. Self-service sign-up is therefore not a product path, so it is
 * refused outright, and no other auth route may set a privilege field.
 */

/** Account privilege fields a client request may never set. */
export const PRIVILEGE_FIELDS = ['role', 'staffId', 'kind'] as const;

export interface SanitizedAuthBody {
  /** True when the route is refused outright (self-service sign-up). */
  blocked: boolean;
  /** Body to forward; unchanged when nothing was stripped. */
  body: string;
}

/** True for the better-auth sign-up routes (`/api/auth/sign-up/email`, …). */
export function isSignUpPath(pathname: string): boolean {
  return /\/sign-up(?:\/|$)/.test(pathname);
}

/**
 * Decide what to do with an auth request body. Pure: no Request, no env, so it
 * is directly testable.
 */
export function sanitizeAuthRequest(
  method: string,
  pathname: string,
  contentType: string | null,
  bodyText: string
): SanitizedAuthBody {
  if (isSignUpPath(pathname)) return { blocked: true, body: bodyText };
  if (method.toUpperCase() !== 'POST') return { blocked: false, body: bodyText };
  if (!(contentType ?? '').toLowerCase().includes('application/json')) {
    return { blocked: false, body: bodyText };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { blocked: false, body: bodyText };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { blocked: false, body: bodyText };
  }

  const record = parsed as Record<string, unknown>;
  let changed = false;
  for (const field of PRIVILEGE_FIELDS) {
    if (field in record) {
      delete record[field];
      changed = true;
    }
  }
  return { blocked: false, body: changed ? JSON.stringify(record) : bodyText };
}

/**
 * Apply {@link sanitizeAuthRequest} to a real request: returns either a `403`
 * response (sign-up refused) or the request to hand to `auth.handler`.
 */
export async function guardAuthRequest(raw: Request): Promise<Request | Response> {
  const { pathname } = new URL(raw.url);

  if (isSignUpPath(pathname)) {
    return Response.json(
      { error: 'Self-service sign-up is disabled for this practice.' },
      { status: 403 }
    );
  }

  if (raw.method.toUpperCase() !== 'POST') return raw;

  const contentType = raw.headers.get('content-type');
  if (!(contentType ?? '').toLowerCase().includes('application/json')) return raw;

  // `clone()` tees the stream, so the original stays readable if we forward it.
  const bodyText = await raw.clone().text();
  const sanitized = sanitizeAuthRequest(raw.method, pathname, contentType, bodyText);
  if (sanitized.blocked) {
    return Response.json(
      { error: 'Self-service sign-up is disabled for this practice.' },
      { status: 403 }
    );
  }
  if (sanitized.body === bodyText) return raw;

  const headers = new Headers(raw.headers);
  headers.delete('content-length');
  return new Request(raw.url, { method: raw.method, headers, body: sanitized.body });
}
