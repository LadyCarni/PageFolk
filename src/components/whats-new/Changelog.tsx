import NextLink from 'next/link'
import { Box, Flex, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown } from '@fortawesome/free-solid-svg-icons'
import type { ChangelogVersionView } from '@/lib/whats-new-view'

function Crown({ label }: { label?: string }) {
  return (
    <Box
      as="span"
      color="antiqueGold"
      mr={2}
      title={label}
      aria-label={label}
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
    >
      <FontAwesomeIcon icon={faCrown} size="xs" />
    </Box>
  )
}

export function Changelog({ versions }: { versions: ChangelogVersionView[] }) {
  return (
    <Box as="section">
      <Heading as="h2" size="lg">
        Changelog
      </Heading>
      <HStack mt={2} spacing={1} color="mist" fontSize="sm">
        <Crown />
        <Text as="span" fontSize="sm" color="mist" ml={-1}>
          Member request
        </Text>
      </HStack>
      <VStack align="stretch" spacing={6} mt={4}>
        {versions.map((v) => (
          <Box key={v.version}>
            <Flex align="baseline" gap={3}>
              <Heading as="h3" size="md">
                Version {v.version}
              </Heading>
              <Text as="span" fontSize="sm" color="mist">
                {v.date}
              </Text>
              {v.isNew && (
                <Text as="span" fontSize="xs" fontWeight={700} px={2} borderRadius="full" bg="dustyRose" color="onGold">
                  New
                </Text>
              )}
            </Flex>
            <VStack as="ul" align="stretch" spacing={1} mt={2} p={0} m={0} listStyleType="none">
              {v.lines.map((l, i) => (
                <Box as="li" key={i}>
                  {l.isMemberRequest && <Crown label="Member request" />}
                  {l.itemId ? (
                    <Link
                      as={NextLink}
                      href={`/whats-new?item=${l.itemId}`}
                      scroll={false}
                      color="body"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {l.text}
                    </Link>
                  ) : (
                    <Text as="span">{l.text}</Text>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
