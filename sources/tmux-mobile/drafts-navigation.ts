export function validateDraftHandoff(baseUrl: string, handoffUrl: string): string {
  if (!handoffUrl) throw new Error('Could not open Drafts. Try again.');
  const url = new URL(handoffUrl, baseUrl);
  if (url.origin !== new URL(baseUrl).origin || url.pathname !== '/auth/browser-handoff') {
    throw new Error('Controller returned an invalid Drafts sign-in link.');
  }
  return url.toString();
}

export function draftNavigationAllowed(baseUrl: string, target: string): boolean {
  if (target === 'about:blank') return true;
  try { return new URL(target).origin === new URL(baseUrl).origin; }
  catch { return false; }
}
