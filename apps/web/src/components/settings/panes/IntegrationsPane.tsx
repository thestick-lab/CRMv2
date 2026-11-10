import * as React from 'react';
import { Calculator, Check, FileSignature, Info, Lock, type LucideIcon } from 'lucide-react';
import { AiIntegrationsPane } from './AiIntegrationsPane';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePracticeStore, type IntegrationConfig } from '@/context/PracticeStoreContext';

export type IntegrationsPaneSection = 'documenso' | 'xero' | 'ai';

interface CredentialField {
  key: keyof IntegrationConfig;
  label: string;
  placeholder: string;
  help?: string;
  secret?: boolean;
}

const DOCUMENSO_FIELDS: CredentialField[] = [
  {
    key: 'documensoBaseUrl',
    label: 'Base URL',
    placeholder: 'https://sign.fdoncall.co.za',
    help: 'Your self-hosted instance or hosted workspace. Documents post to `{base URL}/api/v2`.',
  },
  {
    key: 'documensoApiKey',
    label: 'API key',
    placeholder: 'api_…',
    secret: true,
    help: 'Team → API tokens. Sent as `Authorization: api_…` (never in the browser in live mode).',
  },
];

const XERO_FIELDS: CredentialField[] = [
  { key: 'xeroClientId', label: 'Client ID', placeholder: 'OAuth2 client id' },
  { key: 'xeroClientSecret', label: 'Client secret', placeholder: 'OAuth2 client secret', secret: true },
  {
    key: 'xeroTenantId',
    label: 'Tenant ID',
    placeholder: 'xero-tenant-id',
    help: 'From GET /connections after authorising the accounting.transactions and accounting.settings scopes.',
  },
];

function connectionState(values: IntegrationConfig, fields: CredentialField[]): 'empty' | 'partial' | 'ready' {
  const filled = fields.filter((field) => values[field.key].trim().length > 0).length;
  if (filled === 0) return 'empty';
  return filled === fields.length ? 'ready' : 'partial';
}

const STATE_LABEL: Record<'empty' | 'partial' | 'ready', string> = {
  empty: 'Not connected',
  partial: 'Incomplete',
  ready: 'Credentials stored',
};

const FIELD_CLASS =
  'w-full rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40';

interface CredentialCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  powers: string;
  fields: CredentialField[];
  values: IntegrationConfig;
  onChange: (key: keyof IntegrationConfig, value: string) => void;
}

function CredentialCard({
  icon: Icon,
  title,
  description,
  powers,
  fields,
  values,
  onChange,
}: CredentialCardProps) {
  const state = connectionState(values, fields);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge
          variant={state === 'ready' ? 'crimsonSubdued' : 'outline'}
          className="shrink-0 font-mono text-[11px] text-muted-foreground"
        >
          {STATE_LABEL[state]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.help ? 'sm:col-span-2' : undefined}>
            <label htmlFor={field.key} className="mb-1 block font-medium text-foreground">
              {field.label}
            </label>
            <input
              id={field.key}
              type={field.secret ? 'password' : 'text'}
              value={values[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              placeholder={field.placeholder}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={field.help ? `${field.key}-help` : undefined}
              className={FIELD_CLASS}
            />
            {field.help && (
              <p id={`${field.key}-help`} className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {field.help}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border/60 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Powers:</span> {powers}
        </p>
      </div>
    </div>
  );
}

export interface IntegrationsPaneProps {
  section: IntegrationsPaneSection;
}

/**
 * Settings → Integrations. Documenso and Xero credentials persist in the
 * practice store next to the AI provider keys; the simulated adapters ignore
 * them until the live connections are switched on.
 */
export function IntegrationsPane({ section }: IntegrationsPaneProps) {
  const { integrationConfig, setIntegrationConfig } = usePracticeStore();
  const [draft, setDraft] = React.useState<IntegrationConfig>(integrationConfig);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setDraft(integrationConfig);
  }, [integrationConfig]);

  if (section === 'ai') {
    return <AiIntegrationsPane />;
  }

  const isDocumenso = section === 'documenso';
  const fields = isDocumenso ? DOCUMENSO_FIELDS : XERO_FIELDS;

  const handleChange = (key: keyof IntegrationConfig, value: string) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setIntegrationConfig(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6 text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {isDocumenso ? 'Documenso e-signature' : 'Xero accounting'}
        </h2>
        <p className="mt-0.5 leading-relaxed text-muted-foreground">
          {isDocumenso
            ? 'Send accepted fee quotes for client and counter-signature, then record the signed envelope against the quote.'
            : 'Push invoices as ACCREC draft bills with 15% OUTPUT2 VAT lines, ready for review in Xero.'}
        </p>
      </div>

      <CredentialCard
        icon={isDocumenso ? FileSignature : Calculator}
        title={isDocumenso ? 'Documenso connection' : 'Xero connection'}
        description={
          isDocumenso
            ? 'Workspace endpoint and API token used to create signing envelopes.'
            : 'OAuth2 application credentials plus the tenant the practice bills under.'
        }
        powers={
          isDocumenso
            ? 'Quote signing envelopes, signer order and signed-envelope references.'
            : 'Invoice draft sync, account codes and OUTPUT2 VAT treatment.'
        }
        fields={fields}
        values={draft}
        onChange={handleChange}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm">
          Save credentials
        </Button>
        {saved && (
          <span className="flex items-center gap-1 font-mono text-[11px] text-[#c4161c]">
            <Check className="h-3.5 w-3.5" /> Saved to this browser
          </span>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="leading-relaxed text-muted-foreground">
          Credentials are stored in this browser&apos;s local practice state, like the AI provider
          keys. Signature dispatch and invoice sync run against the local simulated service today;
          the stored credentials are used once the live connections are enabled and are never sent
          from the browser.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="leading-relaxed text-muted-foreground">
          Simulated envelopes and syncs are labelled as such and carry synthetic ids, so none of the
          practice records claim an external document that does not exist yet.
        </p>
      </div>
    </form>
  );
}
