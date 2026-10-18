import { describe, it, expect } from 'vitest';
import { draftNavigationAllowed, validateDraftHandoff } from './drafts-navigation';
describe('embedded Drafts navigation', () => {
  const base = 'https://eng.xyznot.com';
  it('exchanges the app login through the same controller only', () => {
    expect(validateDraftHandoff(base, '/auth/browser-handoff?ticket=one-time')).toBe(base + '/auth/browser-handoff?ticket=one-time');
    expect(() => validateDraftHandoff(base, 'https://other.example/auth/browser-handoff')).toThrow();
    expect(() => validateDraftHandoff(base, '/drafts')).toThrow();
    expect(() => validateDraftHandoff(base, '')).toThrow();
  });
  it('keeps list, draft content, comments and history inside the controller', () => {
    for (const route of ['/drafts?embedded=1', '/drafts?id=abc&embedded=1', '/api/drafts/content?id=abc&version=1']) expect(draftNavigationAllowed(base,base+route)).toBe(true);
    expect(draftNavigationAllowed(base,'about:blank')).toBe(true);
    expect(draftNavigationAllowed(base,'https://other.example/')).toBe(false);
    expect(draftNavigationAllowed(base,'javascript:alert(1)')).toBe(false);
    expect(draftNavigationAllowed(base,'file:///private/data')).toBe(false);
  });
});
