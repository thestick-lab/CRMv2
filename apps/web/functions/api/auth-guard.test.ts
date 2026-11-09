import { describe, expect, it } from 'vitest';
import {
  PRIVILEGE_FIELDS,
  guardAuthRequest,
  isSignUpPath,
  sanitizeAuthRequest,
} from './auth-guard';

const SIGN_UP = '/api/auth/sign-up/email';
const UPDATE_USER = '/api/auth/update-user';

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`https://crm.example.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('auth guard', () => {
  it('refuses self-service sign-up outright', async () => {
    expect(isSignUpPath(SIGN_UP)).toBe(true);
    expect(isSignUpPath('/api/auth/sign-up')).toBe(true);
    expect(isSignUpPath('/api/auth/sign-in/email')).toBe(false);

    const response = await guardAuthRequest(
      jsonRequest(SIGN_UP, { email: 'x@example.com', password: 'hunter2', name: 'X', role: 'Partner' })
    );
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(403);
    const payload = (await (response as Response).json()) as { error?: string };
    expect(payload.error).toMatch(/disabled/i);
  });

  it('refuses a sign-up sent as form data too', async () => {
    const raw = new Request(`https://crm.example.com${SIGN_UP}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=x%40example.com&password=hunter2&role=Partner',
    });
    const response = await guardAuthRequest(raw);
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(403);
  });

  it('strips every privilege field from any other auth POST', async () => {
    const response = await guardAuthRequest(
      jsonRequest(UPDATE_USER, { name: 'New name', role: 'Partner', staffId: 'wouter', kind: 'employee' })
    );
    expect(response).toBeInstanceOf(Request);
    const forwarded = response as Request;
    const body = (await forwarded.json()) as Record<string, unknown>;
    expect(body).toEqual({ name: 'New name' });
    for (const field of PRIVILEGE_FIELDS) expect(field in body).toBe(false);
    // The rewritten request must not carry a stale Content-Length.
    expect(forwarded.headers.get('content-length')).toBeNull();
    expect(forwarded.headers.get('content-type')).toBe('application/json');
  });

  it('forwards an untouched body when no privilege field is present', async () => {
    const raw = jsonRequest(UPDATE_USER, { name: 'New name' });
    const response = await guardAuthRequest(raw);
    expect(response).toBe(raw);
  });

  it('leaves non-JSON and non-POST requests alone', async () => {
    const form = new Request(`https://crm.example.com${UPDATE_USER}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'role=Partner',
    });
    expect(await guardAuthRequest(form)).toBe(form);

    const get = new Request('https://crm.example.com/api/auth/session', { method: 'GET' });
    expect(await guardAuthRequest(get)).toBe(get);
  });

  it('survives a malformed JSON body without blocking the request', () => {
    expect(sanitizeAuthRequest('POST', UPDATE_USER, 'application/json', '{not json')).toEqual({
      blocked: false,
      body: '{not json',
    });
    expect(sanitizeAuthRequest('POST', UPDATE_USER, 'application/json', '"a string"')).toEqual({
      blocked: false,
      body: '"a string"',
    });
  });

  it('matches the route path the worker actually serves', () => {
    // Regression pin: the guard must cover the real endpoint shape.
    expect(isSignUpPath('/api/auth/sign-up/email')).toBe(true);
    expect(sanitizeAuthRequest('POST', '/api/auth/sign-up/email', 'application/json', '{}').blocked).toBe(
      true
    );
  });
});
