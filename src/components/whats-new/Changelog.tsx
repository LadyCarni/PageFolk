import NextLink from 'next/link'
import { Box, Flex, Heading, Link, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown } from '@fortawesome/free-solid-svg-icons'
import { formatVersionDate } from '@/lib/changelog'
import type { ChangelogVersionView } from '@/lib/whats-new-view'
import { MemberRequestBadge } from '@/components/whats-new/MemberRequestBadge'

function RequestCrown() {
  return (
    <Box as="span" color="antiqueGold" mr={2} title="Member request" aria-label="Member request" role="img">
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
      <Box mt={3}>
        <MemberRequestBadge />
      </Box>
      <VStack align="stretch" spacing={10} mt={8}>
        {versions.map((v) => (
          <Box key={v.version}>
            <Flex align="baseline" gap={3} wrap="wrap">
              <Heading as="h3" size="xl" fontWeight={500}>
                {v.version}{' '}
                <Text as="span" color="mist" fontWeight={400}>
                  ({formatVersionDate(v.date)})
                </Text>
              </Heading>
              {v.isNew && (
                <Text as="span" fontSize="xs" fontWeight={700} px={2} borderRadius="full" bg="dustyRose" color="onGold">
                  New
                </Text>
              )}
            </Flex>
            {/* The lines sit inset behind a thin border, like a margin rule in a notebook. */}
            <Box mt={4} ml={{ base: 1, md: 2 }} pl={{ base: 5, md: 8 }} py={1} borderLeftWidth="2px" borderColor="borderGold">
              <VStack
                as="ul"
                align="stretch"
                spacing={2}
                m={0}
                pl={5}
                listStyleType="disc"
                sx={{ '& > li::marker': { color: 'var(--chakra-colors-mist)' } }}
              >
                {v.lines.map((l, i) => (
                  <Box as="li" key={i} color="body">
                    {l.isMemberRequest && <RequestCrown />}
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
          </Box>
        ))}
      </VStack>
    </Box>
  )
}
