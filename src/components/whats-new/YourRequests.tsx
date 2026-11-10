import NextLink from 'next/link'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { MyRequest } from '@/lib/whats-new-view'
import { StatusLabel } from './StatusLabel'

export function YourRequests({ requests, selectedId }: { requests: MyRequest[]; selectedId: string | null }) {
  if (requests.length === 0) return null
  return (
    <Box as="section">
      <Heading as="h2" size="lg">
        Your requests
      </Heading>
      <VStack as="ul" align="stretch" spacing={2} mt={3} p={0} m={0} listStyleType="none">
        {requests.map((r) => {
          const selected = r.id === selectedId
          return (
            <Box as="li" key={r.id}>
              <Flex
                as={NextLink}
                href={`/whats-new?item=${r.id}`}
                scroll={false}
                justify="space-between"
                align="center"
                gap={3}
                px={4}
                py={3}
                borderWidth="1px"
                borderRadius="lg"
                borderColor={selected ? 'borderOpen' : 'border'}
                bg={selected ? 'bubbleMine' : 'velvet'}
                aria-current={selected ? 'true' : undefined}
              >
                <Text as="span" color="parchment">
                  {r.title}
                </Text>
                <StatusLabel status={r.display} />
              </Flex>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}
