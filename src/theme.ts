import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  fonts: {
    heading: 'var(--font-cormorant), Georgia, serif',
    body: 'var(--font-lora), Georgia, serif',
  },
  colors: {
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
    bubbleOther: '#26181f', // other members' top-level note bubbles
    bubbleOtherReply: '#211820', // other members' reply bubbles
    bubbleMine: '#3a2230', // your message bubbles and the selected thread
    divider: '#3a2733', // dividers and header borders
    border: '#5a4050', // card and bubble borders
    borderOpen: '#6b4a5b', // open thread card borders
    borderMuted: '#7a5568', // sealed dashed borders, input borders, small ornaments
    progressCurrent: '#9b5a6e', // progress bar segment you're partway through
    progressTodo: '#3a2833', // progress bar segments not yet reached
    onGold: '#1a0f14', // dark text on gold buttons and avatars
    // Not in the supplied palette: destructive actions and error messages
    danger: '#e58f95',
  },
  styles: {
    global: {
      body: {
        bg: 'midnightPlum',
        color: 'parchment',
      },
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: '#5a4050 transparent',
      },
      '*::-webkit-scrollbar': { width: '8px', height: '8px' },
      '*::-webkit-scrollbar-thumb': { background: '#5a4050', borderRadius: '8px' },
      '*::-webkit-scrollbar-track': { background: 'transparent' },
    },
  },
  components: {
    Heading: {
      baseStyle: { color: 'parchment', fontWeight: 600 },
    },
    Text: {
      baseStyle: { color: 'body' },
    },
    Link: {
      baseStyle: { color: 'antiqueGold', _hover: { textDecoration: 'underline' } },
    },
    Button: {
      variants: {
        solid: {
          bg: 'antiqueGold',
          color: 'onGold',
          _hover: { filter: 'brightness(1.08)', _disabled: { filter: 'none' } },
          _active: { filter: 'brightness(0.95)' },
        },
        link: {
          color: 'antiqueGold',
          _hover: { textDecoration: 'underline' },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'velvet',
            color: 'parchment',
            borderColor: 'borderMuted',
            _placeholder: { color: 'mist' },
            _hover: { borderColor: 'antiqueGold' },
            _focusVisible: { borderColor: 'antiqueGold', boxShadow: '0 0 0 1px #d4b06a' },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: 'velvet',
          color: 'parchment',
          borderColor: 'borderMuted',
          _placeholder: { color: 'mist' },
          _hover: { borderColor: 'antiqueGold' },
          _focusVisible: { borderColor: 'antiqueGold', boxShadow: '0 0 0 1px #d4b06a' },
        },
      },
    },
  },
})

export default theme
