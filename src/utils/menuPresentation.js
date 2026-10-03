// The server's current preference wins over stale fields from older clients.
// Fall back only when the newer field is absent, not when it selects images.
export const isSimpleMenu = (hotel) => (
  hotel?.menuMode ?? hotel?.menuDisplayMode ?? (hotel?.simpleMenu ? 'simple' : 'graphic')
) === 'simple';
