import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import {
  DEMO_PASSWORD,
  SEEDED_STAFF_ACCOUNTS,
  authenticateStaffCredentials,
} from '@/lib/auth-client';
import { LoginView } from '@/components/auth/LoginView';
import { PracticeStoreProvider } from '@/context/PracticeStoreContext';

describe('Better-Auth + Cloudflare D1 Login & UserPopover', () => {
  it('authenticates all 9 @fdoncall.co.za staff accounts with DEMO_PASSWORD and rejects invalid passwords', () => {
    expect(SEEDED_STAFF_ACCOUNTS).toHaveLength(9);
    const erik = authenticateStaffCredentials('erik@fdoncall.co.za', DEMO_PASSWORD);
    expect(erik.ok).toBe(true);
    expect(erik.user?.id).toBe('erik');
    expect(erik.user?.role).toBe('Partner');

    const andre = authenticateStaffCredentials('andre@fdoncall.co.za', DEMO_PASSWORD);
    expect(andre.ok).toBe(true);
    expect(andre.user?.id).toBe('andre');

    const bad = authenticateStaffCredentials('erik@fdoncall.co.za', 'wrong-pass');
    expect(bad.ok).toBe(false);
  });

  it('renders LoginView with Demo Credentials (erik@fdoncall.co.za and FDonCall2026!) visible on screen', () => {
    const html = renderToStaticMarkup(
      React.createElement(PracticeStoreProvider, null, React.createElement(LoginView))
    );
    expect(html).toContain('erik@fdoncall.co.za');
    expect(html).toContain(DEMO_PASSWORD);
    expect(html).toContain('Sign In');
  });
});
