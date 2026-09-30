import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  colors: {
    brand: {
      900: '#241626',
      700: '#542949',
      500: '#7b3f5d',
      300: '#b86f71',
      100: '#e7b7a6',
      50: '#fff0eb',
    },
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
