// Shared look for the admin page's cards and small uppercase labels.
export const CARD_PROPS = {
  bg: 'velvet',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: '2xl',
  p: { base: 5, md: 7 },
} as const

export const LABEL_PROPS = { fontSize: 'xs', letterSpacing: '0.14em', textTransform: 'uppercase' } as const
