import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissingInformationPanel } from './MissingInformationPanel';
import type { MissingInformationItem } from '../client-record-data';

const ITEM: MissingInformationItem = {
  id: 'email',
  label: 'Email address',
  kind: 'contact',
  hint: 'Primary correspondence channel',
};

/**
 * I2: a read-only client record lists what is missing, but must not offer an
 * `Add` that opens the channel editor only for the save to be discarded.
 */
describe('MissingInformationPanel', () => {
  it('offers the Add affordance to a role that can edit the record', () => {
    const markup = renderToStaticMarkup(
      <MissingInformationPanel items={[ITEM]} onAdd={() => undefined} />
    );
    expect(markup).toContain('Email address');
    expect(markup).toContain('>Add<');
  });

  it('renders no Add affordance in read-only mode while keeping the gap listed', () => {
    const markup = renderToStaticMarkup(
      <MissingInformationPanel items={[ITEM]} onAdd={() => undefined} readOnly />
    );
    expect(markup).toContain('Email address');
    expect(markup).not.toContain('>Add<');
    expect(markup).not.toContain('<button');
  });

  it('passes the record’s read-only flag through from the statutory tab', () => {
    const tab = fs.readFileSync(
      'src/components/client-show/tabs/StatutoryProfileTab.tsx',
      'utf8'
    );
    expect(tab).toContain('onAdd={handleMissingAdd} readOnly={readOnly}');
    expect(tab).toContain('const handleMissingAdd = (item: MissingInformationItem) => {\n    if (readOnly) return;');
  });
});
