/* ---------------------------------------------------------------------------
 * Entry-sheet client scope.
 *
 * A Limited (`Time — log own`) role may only bill its assigned clients, but an
 * entry captured before that scope changed must stay editable. These helpers
 * keep the picker and the validation in agreement: the entry's own client is
 * offered and accepted, everything else must be assigned.
 * ------------------------------------------------------------------------- */

export interface ClientRef {
  code: string;
}

/** Picker options: the assigned set, plus the entry's own historical client. */
export function entryPickerClients<T extends ClientRef>(
  allClients: readonly T[],
  selectable: readonly T[],
  entryClientCode: string
): T[] {
  if (!entryClientCode || selectable.some((client) => client.code === entryClientCode)) {
    return [...selectable];
  }
  return [...selectable, ...allClients.filter((client) => client.code === entryClientCode)];
}

/** Whether the chosen client may be billed on this entry. */
export function entryClientInScope<T extends ClientRef>(
  clientCode: string,
  selectable: readonly T[],
  entryClientCode: string
): boolean {
  if (!clientCode) return false;
  if (clientCode === entryClientCode) return true;
  return selectable.some((client) => client.code === clientCode);
}
