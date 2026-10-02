// Height for the note text area: it grows with its content up to maxLines, then scrolls.
// `scrollHeight` excludes borders, so they are added back; padding is already inside it.
export function computeTextareaHeight(input: {
  scrollHeight: number
  lineHeight: number
  paddingSpace: number
  borderSpace: number
  maxLines: number
}): { height: number; scroll: boolean } {
  const maxHeight = input.maxLines * input.lineHeight + input.paddingSpace + input.borderSpace
  const wanted = input.scrollHeight + input.borderSpace
  // One pixel of tolerance so sub-pixel rounding never makes an exactly-full box scroll.
  return wanted > maxHeight + 1 ? { height: maxHeight, scroll: true } : { height: wanted, scroll: false }
}

export function appendStarter(current: string, prompt: string): string {
  const existing = current.replace(/\s+$/, '')
  return existing === '' ? prompt : `${existing}\n${prompt}`
}
