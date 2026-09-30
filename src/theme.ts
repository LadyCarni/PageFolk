import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  colors: {
    brand: {
      900: '#241626',
      700: '#542949',
      500: '#7b3f5d',
      300: '#b86f71',
      100: '#e7b7a6',
    },
  },
  styles: {
    global: {
      body: {
        bg: '#ffeae3',
      },
    },
  },
})

export default theme
