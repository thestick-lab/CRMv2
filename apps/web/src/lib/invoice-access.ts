import type { Invoice } from '@/context/PracticeStoreContext';
import { can, type PermissionState, type Role } from '@/lib/permissions';

/* ---------------------------------------------------------------------------
 * Invoice permissions for the sales pipeline and the invoice editor.
 *
 * `Quotes — view/create/send` grants the pipeline board, never the invoice
 * register behind it. Every invoice surface therefore asks these helpers, and
 * the data itself is filtered (`invoicesForRole`) rather than merely hidden —
 * a Team member's register is empty, not disabled.
 * ------------------------------------------------------------------------- */

export type SalesTabId = 'pipeline' | 'quotes' | 'invoices';

/** §6.9 `Invoices — view`. */
export function canViewInvoices(role: Role, matrix?: PermissionState['matrix']): boolean {
  return can(role, 'Invoices', 'view', matrix);
}

/** §6.9 `Invoices — create/send`: the write grant behind every mutation. */
export function canManageInvoices(role: Role, matrix?: PermissionState['matrix']): boolean {
  return canViewInvoices(role, matrix) && can(role, 'Invoices', 'create-send', matrix);
}

/**
 * The pipeline tabs a role may use. The Invoices tab only exists for roles
 * that may read invoices; everyone else sees Pipeline and Quotes.
 */
export function salesTabsFor(
  role: Role,
  matrix?: PermissionState['matrix']
): SalesTabId[] {
  const tabs: SalesTabId[] = ['pipeline', 'quotes'];
  if (canViewInvoices(role, matrix)) tabs.push('invoices');
  return tabs;
}

/** The invoice register this role may read: the full list, or nothing. */
export function invoicesForRole(
  role: Role,
  matrix: PermissionState['matrix'] | undefined,
  invoices: Invoice[]
): Invoice[] {
  return canViewInvoices(role, matrix) ? invoices : [];
}

export interface InvoicePushCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Whether the Xero push may run. A push persists the invoice (recomputing
 * totals, marking time billed and writing activity), so it needs the invoice
 * write grant in addition to a resolvable Xero contact.
 */
export function canPushInvoiceToXero(
  role: Role,
  matrix: PermissionState['matrix'] | undefined,
  state: { hasXeroClient: boolean; alreadySynced: boolean }
): InvoicePushCheck {
  if (!canManageInvoices(role, matrix)) {
    return { allowed: false, reason: `${role} cannot push invoices to Xero` };
  }
  if (state.alreadySynced) {
    return { allowed: false, reason: 'This invoice is already pushed' };
  }
  if (!state.hasXeroClient) {
    return { allowed: false, reason: 'A client record is required before the Xero draft' };
  }
  return { allowed: true };
}
