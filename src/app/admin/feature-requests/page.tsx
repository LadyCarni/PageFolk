import { Box, Heading, Text } from '@chakra-ui/react'
import { requireAdmin } from '@/lib/session'
import { listAdminRoadmap } from '@/lib/roadmap'
import { FeatureRequestsAdmin } from '@/components/admin/FeatureRequestsAdmin'

export default async function FeatureRequestsPage() {
  await requireAdmin()
  const { pending, active } = await listAdminRoadmap()

  return (
    <Box maxW="3xl" mx="auto" p={{ base: 6, md: 8 }}>
      <Heading as="h1" size="2xl">
        Feature requests
      </Heading>
      <Text color="mist" mt={2} mb={8}>
        Review what members suggest and keep the roadmap up to date.
      </Text>
      <FeatureRequestsAdmin pending={pending} active={active} />
    </Box>
  )
}
