import { Box, Grid, VStack } from '@chakra-ui/react'
import { requireUser } from '@/lib/session'
import { NAV_HEIGHT_PX } from '@/lib/layout'
import { markVersionSeen } from '@/lib/whats-new'
import { getWhatsNewView } from '@/lib/whats-new-view'
import { Changelog } from '@/components/whats-new/Changelog'
import { ItemThreadPane } from '@/components/whats-new/ItemThreadPane'
import { RoadmapCard } from '@/components/whats-new/RoadmapCard'
import { SuggestFeature } from '@/components/whats-new/SuggestFeature'
import { YourRequests } from '@/components/whats-new/YourRequests'

export default async function WhatsNewPage({ searchParams }: { searchParams: { item?: string | string[] } }) {
  const user = await requireUser()
  const before = await markVersionSeen(user.id)
  const requested = typeof searchParams.item === 'string' ? searchParams.item : undefined
  const view = await getWhatsNewView(user, before, requested)
  const { selected } = view
  const selectedId = selected?.id ?? null

  const column = (
    <VStack align="stretch" spacing={10} maxW="760px" mx="auto" px={{ base: 4, md: 8 }} py={8}>
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

  if (!selected) return column

  const fullHeight = `calc(100dvh - ${NAV_HEIGHT_PX}px)`
  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} h={{ lg: fullHeight }} minH={{ base: fullHeight }}>
      <Box display={{ base: 'none', lg: 'block' }} overflowY={{ lg: 'auto' }} minH={0}>
        {column}
      </Box>
      <Box
        as="main"
        bg="panel"
        borderLeftWidth={{ lg: '1px' }}
        borderColor="divider"
        minH={0}
        h={{ base: fullHeight, lg: '100%' }}
      >
        <ItemThreadPane thread={selected} viewer={user} backHref="/whats-new" />
      </Box>
    </Grid>
  )
}
