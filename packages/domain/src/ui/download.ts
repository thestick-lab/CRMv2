// Offering a generated file to the person viewing the page.
// Inside claude.ai the page asks the viewer through the downloads capability (they confirm the save);
// a copy of the page opened on its own uses an ordinary browser download.

export type SaveOutcome = 'saved' | 'declined' | 'busy' | 'unavailable';

const host = () => (window as any).claude as { use: (name: string) => Promise<any> } | undefined;

/** Whether this view can save files: true, false, or undefined while it is still being asked. */
export async function canDownload(): Promise<boolean> {
  const h = host();
  if (!h || typeof h.use !== 'function') return true;
  try {
    return !!(await h.use('downloads'));
  } catch {
    return false;
  }
}

export async function offerDownload(filename: string, data: Uint8Array, mime: string): Promise<SaveOutcome> {
  const blob = new Blob([data as unknown as BlobPart], { type: mime });
  const h = host();
  if (h && typeof h.use === 'function') {
    const downloads = await h.use('downloads');
    if (!downloads) return 'unavailable';
    try {
      await downloads.save({ filename, data: blob });
      return 'saved';
    } catch (e: any) {
      if (e?.code === 'declined') return 'declined';
      if (e?.code === 'rate_limited') return 'busy';
      return 'unavailable';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'saved';
}
