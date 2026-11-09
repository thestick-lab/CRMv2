import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { consumeInitialClientCode } from './SalesPipelineView';

/**
 * M8: `Add Action → New Quote` on a client record asks the sales board to open
 * the builder once, pre-selected. The parent clears `initialClientCode` after
 * consuming it, so the latch must reset with it — a second request from the
 * same client has to open the builder again.
 */
describe('client record → New Quote intent', () => {
  it('opens the builder for the requested client exactly once', () => {
    const first = consumeInitialClientCode(undefined, 'MUS-875');
    expect(first.open).toBe('MUS-875');
    expect(first.consumed).toBe('MUS-875');

    // The same prop value re-rendering before the parent clears it must not
    // reopen the builder.
    const stillPending = consumeInitialClientCode(first.consumed, 'MUS-875');
    expect(stillPending.open).toBeUndefined();
    expect(stillPending.consumed).toBe('MUS-875');
  });

  it('resets when the request is consumed so the same client can ask again', () => {
    const first = consumeInitialClientCode(undefined, 'MUS-875');
    const cleared = consumeInitialClientCode(first.consumed, undefined);
    expect(cleared).toEqual({ consumed: undefined, open: undefined });

    const second = consumeInitialClientCode(cleared.consumed, 'MUS-875');
    expect(second.open).toBe('MUS-875');
  });

  it('wires the helper into the consumption effect', () => {
    const source = fs.readFileSync('src/components/pipeline/SalesPipelineView.tsx', 'utf8');
    expect(source).toContain('consumeInitialClientCode(');
    expect(source).toContain('consumedInitialClient.current = intent.consumed');
    expect(source).toContain('if (!intent.open) return');
  });
});
