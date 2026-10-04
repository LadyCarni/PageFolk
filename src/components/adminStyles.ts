// Shared look for the admin page's cards and small uppercase labels.
export const CARD_PROPS = {
  bg: 'velvet',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: '2xl',
  p: { base: 5, md: 7 },
} as const

export const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const

// Admin inputs sit on velvet cards, so they use the darker page background to stand out.
export const FIELD_PROPS = { bg: 'midnightPlum' } as const

// Admin dropdowns look like the Starters button: a gold outline pill. The open list is drawn by
// the browser, so its options get the velvet background and parchment text explicitly; otherwise
// they inherit the pale text color on the browser's white list.
export const SELECT_PROPS = {
  bg: 'transparent',
  color: 'antiqueGold',
  borderColor: 'antiqueGold',
  borderRadius: 'full',
  iconColor: 'antiqueGold',
  _hover: { bg: 'mulberry' },
  _focusVisible: { borderColor: 'antiqueGold', boxShadow: '0 0 0 1px #d4b06a' },
  sx: { option: { bg: 'velvet', color: 'parchment' } },
} as const
