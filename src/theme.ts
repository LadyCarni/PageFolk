import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  fonts: {
    heading: 'var(--font-cormorant), Georgia, serif',
    body: 'var(--font-lora), Georgia, serif',
  },
  colors: {
    brand: {
      900: '#241626',
      700: '#542949',
      500: '#7b3f5d',
      300: '#b86f71',
      100: '#e7b7a6',
      50: '#fff0eb',
    },
    // Dark theme palette
    midnightPlum: '#170f14', // page background
    velvet: '#22161d', // cards, input fields
    mulberry: '#2d1d26', // open thread cards
    claret: '#5b2236', // book cover
    dustyRose: '#d99aa8', // small labels, member name
    antiqueGold: '#d4b06a', // wordmark, buttons, ornaments, progress
    parchment: '#f1e6d6', // main text
    mist: '#c2b0a8', // secondary text
    // Supporting tones
    body: '#e2d3c4', // body paragraphs (softer than parchment)
    panel: '#1b1117', // desktop thread panel background
    sealed: '#1d131a', // sealed thread cards
    bubbleOther: '#26181f', // other members' message bubbles
    bubbleMine: '#3a2230', // your message bubbles and the selected thread
    divider: '#3a2733', // dividers and header borders
    border: '#5a4050', // card and bubble borders
    borderOpen: '#6b4a5b', // open thread card borders
    borderMuted: '#7a5568', // sealed dashed borders, input borders, small ornaments
    progressCurrent: '#9b5a6e', // progress bar segment you're partway through
    progressTodo: '#3a2833', // progress bar segments not yet reached
    onGold: '#1a0f14', // dark text on gold buttons and avatars
  },
  styles: {
    global: {
      body: {
        bg: '#ffeae3',
      },
    },
  },
  components: {
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'brand.50',
            borderColor: 'brand.500',
            _hover: { borderColor: 'brand.500' },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'brand.50',
          borderColor: 'brand.500',
          _hover: { borderColor: 'brand.500' },
        },
      },
    },
  },
})

export default theme
