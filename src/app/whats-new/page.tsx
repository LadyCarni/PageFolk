import { cookies } from 'next/headers'
import { Box, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { getLastSeenVersion } from '@/lib/whats-new'
import { getWhatsNewView } from '@/lib/whats-new-view'
import { MarkSeen } from '@/components/whats-new/MarkSeen'
import { Changelog } from '@/components/whats-new/Changelog'
import { ItemThreadPane } from '@/components/whats-new/ItemThreadPane'
import { RoadmapCard } from '@/components/whats-new/RoadmapCard'
import { SuggestFeature } from '@/components/whats-new/SuggestFeature'
import { YourRequests } from '@/components/whats-new/YourRequests'

export default async function WhatsNewPage({ searchParams }: { searchParams: { item?: string | string[] } }) {
  const user = await requireUser()
  const prevCookie = cookies().get('whats_new_prev')
  const before = prevCookie ? prevCookie.value || null : await getLastSeenVersion(user.id)
  const requested = typeof searchParams.item === 'string' ? searchParams.item : undefined
  const view = await getWhatsNewView(user, before, requested)
  const { selected } = view
  const selectedId = selected?.id ?? null

  const column = (
    // Left-aligned on the nav's gutter, with a readable maximum width, rather than centred.
    <VStack align="stretch" spacing={10} maxW="880px" px={{ base: 4, md: 8 }} py={8}>
      <Box>
        <Heading as="h1" size="2xl">
          What&apos;s new
        </Heading>
        <Text color="mist" mt={2}>
          What we&apos;re building next, and everything that&apos;s changed.
        </Text>
      </Box>
      <Box as="section">
        <SuggestFeature />
        <VStack as="ul" align="stretch" spacing={3} mt={4} p={0} m={0} listStyleType="none">
          {view.roadmap.map((card) => (
            <Box as="li" key={card.id}>
              <RoadmapCard card={card} selected={card.id === selectedId} />
            </Box>
          ))}
        </VStack>
      </Box>
      <YourRequests requests={view.myRequests} selectedId={selectedId} />
      <Changelog versions={view.changelog} />
    </VStack>
  )

  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`
  // One stable tree whether or not a thread is open, so selecting an item does not remount the
  // column (which would reset its scroll and any open Suggest form).
  return (
    <>
      <MarkSeen />
      <Grid
        as="main"
        templateColumns={selected ? { base: '1fr', lg: '1fr 1fr' } : '1fr'}
        h={selected ? { lg: fullHeight } : undefined}
        minH={selected ? { base: fullHeight } : undefined}
      >
        <Box
          display={selected ? { base: 'none', lg: 'block' } : 'block'}
          overflowY={selected ? { lg: 'auto' } : undefined}
          minH={0}
        >
          {column}
        </Box>
        <Box
          as="section"
          aria-label="Request thread"
          display={selected ? 'block' : 'none'}
          bg="panel"
          borderLeftWidth={{ lg: '1px' }}
          borderColor="divider"
          minH={0}
          h={{ base: fullHeight, lg: '100%' }}
        >
          {selected && <ItemThreadPane thread={selected} viewer={user} backHref="/whats-new" />}
        </Box>
      </Grid>
    </>
  )
}
