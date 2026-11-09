import {
  Calculator,
  FileSignature,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { AiIntegrationsPane } from './AiIntegrationsPane';
import { Badge } from '@/components/ui/badge';

export type IntegrationsPaneSection = 'documenso' | 'xero' | 'ai';

interface CredentialField {
  id: string;
  label: string;
  placeholder: string;
  help?: string;
}

const DOCUMENSO_FIELDS: CredentialField[] = [
  {
    id: 'documenso-base-url',
    label: 'Base URL',
    placeholder: 'https://app.documenso.com',
    help: 'Your Documenso instance or hosted workspace.',
  },
  {
    id: 'documenso-api-key',
    label: 'API key',
    placeholder: 'dcm_…',
    help: 'Created under Team → API tokens in Documenso.',
  },
];

const XERO_FIELDS: CredentialField[] = [
  { id: 'xero-client-id', label: 'Client ID', placeholder: 'OAuth2 client id' },
  { id: 'xero-client-secret', label: 'Client secret', placeholder: 'OAuth2 client secret' },
  {
    id: 'xero-tenant-id',
    label: 'Tenant ID',
    placeholder: 'xero-tenant-id',
    help: 'From GET /connections after authorising the app.',
  },
];

interface CredentialCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  powers: string;
  fields: CredentialField[];
}

function CredentialCard({ icon: Icon, title, description, powers, fields }: CredentialCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 font-mono text-[10px] text-muted-foreground">
          Not connected
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.id} className={field.help ? 'sm:col-span-2' : undefined}>
            <label htmlFor={field.id} className="mb-1 block font-medium text-foreground">
              {field.label}
            </label>
            <input
              id={field.id}
              type="text"
              disabled
              placeholder={field.placeholder}
              aria-describedby={field.help ? `${field.id}-help` : undefined}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
            />
            {field.help && (
              <p id={`${field.id}-help`} className="mt-1 text-[11px] text-muted-foreground">
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
 * Settings → Integrations. Documenso and Xero show the credentials the
 * connection will ask for (placeholders until the integration service is
 * enabled); the AI provider keys are the existing, live credential form.
 */
export function IntegrationsPane({ section }: IntegrationsPaneProps) {
  if (section === 'ai') {
    return <AiIntegrationsPane />;
  }

  const isDocumenso = section === 'documenso';

  return (
    <div className="space-y-6 max-w-3xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {isDocumenso ? 'Documenso e-signature' : 'Xero accounting'}
        </h2>
        <p className="mt-0.5 text-muted-foreground">
          {isDocumenso
            ? 'Send accepted fee quotes for client and counter-signature, then record the signed envelope against the quote.'
            : 'Push invoices as ACCREC draft bills with 15% OUTPUT2 VAT lines, ready for review in Xero.'}
        </p>
      </div>

      {isDocumenso ? (
        <CredentialCard
          icon={FileSignature}
          title="Documenso connection"
          description="Workspace endpoint and API token used to create signing envelopes."
          powers="Quote signing envelopes, signer order and signed-envelope references."
          fields={DOCUMENSO_FIELDS}
        />
      ) : (
        <CredentialCard
          icon={Calculator}
          title="Xero connection"
          description="OAuth2 application credentials plus the tenant the practice bills under."
          powers="Invoice draft sync, account codes and OUTPUT2 VAT treatment."
          fields={XERO_FIELDS}
        />
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3.5">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="leading-relaxed text-muted-foreground">
          These credential fields are placeholders until the integration service is enabled.
          Signing and invoice sync currently run against the local simulated service, so no
          secrets are stored or transmitted.
        </p>
      </div>
    </div>
  );
}
