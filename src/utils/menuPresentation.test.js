import { describe, expect, it } from 'vitest';
import { isSimpleMenu } from './menuPresentation';

describe('menu presentation preference', () => {
  it.each(['graphic', 'visual'])('honors canonical %s over stale legacy simple flags', menuMode => {
    expect(isSimpleMenu({ menuMode, menuDisplayMode: 'simple', simpleMenu: true })).toBe(false);
  });
  it('honors canonical simple even when aliases request images', () => {
    expect(isSimpleMenu({ menuMode: 'simple', menuDisplayMode: 'graphic', simpleMenu: false })).toBe(true);
  });
  it('supports legacy-only data and defaults to pictures', () => {
    expect(isSimpleMenu({ menuDisplayMode: 'simple' })).toBe(true);
    expect(isSimpleMenu({ simpleMenu: true })).toBe(true);
    expect(isSimpleMenu({ menuDisplayMode: 'graphic', simpleMenu: true })).toBe(false);
    expect(isSimpleMenu(null)).toBe(false);
  });
});
