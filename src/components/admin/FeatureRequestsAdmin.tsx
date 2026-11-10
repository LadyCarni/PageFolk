import { Box, Heading, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { CARD_PROPS, FIELD_PROPS, LABEL_PROPS } from '@/components/adminStyles'
import { createRoadmapItemAction } from '@/app/admin/feature-requests/actions'
import { FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX } from '@/lib/limits'
import { formatRelativeTime } from '@/lib/time'
import type { listAdminRoadmap } from '@/lib/roadmap'
import { ApproveForm, DeclineForm } from './RequestReviewForms'
import { RoadmapItemRow } from './RoadmapItemRow'

type AdminRoadmap = Awaited<ReturnType<typeof listAdminRoadmap>>

export function FeatureRequestsAdmin({ pending, active }: AdminRoadmap) {
  return (
    <VStack align="stretch" spacing={8}>
      <Box as="section" aria-labelledby="review-heading" {...CARD_PROPS}>
        <Heading as="h2" id="review-heading" size="lg">
          Waiting for review
        </Heading>
        {pending.length === 0 ? (
          <Text color="mist" fontStyle="italic" mt={3}>
            Nothing waiting for review.
          </Text>
        ) : (
          <VStack as="ul" listStyleType="none" align="stretch" spacing={5} mt={4} mb={0} mx={0} p={0}>
            {pending.map((request) => (
              <Box as="li" key={request.id} p={4} bg="midnightPlum" borderRadius="xl" borderWidth="1px" borderColor="divider">
                <Text fontSize="sm" color="mist">
                  {request.author.name ?? 'A member'} · {formatRelativeTime(request.createdAt)}
                </Text>
                <Text fontWeight={600} color="parchment" mt={1}>
                  {request.originalTitle}
                </Text>
                <Text color="parchment" whiteSpace="pre-wrap" mb={4}>
                  {request.originalDescription}
                </Text>
                <ApproveForm itemId={request.id} title={request.title} description={request.description} />
                <Box mt={4}>
                  <DeclineForm itemId={request.id} />
                </Box>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      <Box as="section" aria-labelledby="roadmap-heading" {...CARD_PROPS}>
        <Heading as="h2" id="roadmap-heading" size="lg">
          Roadmap
        </Heading>
        {active.length === 0 ? (
          <Text color="mist" fontStyle="italic" mt={3}>
            Nothing on the roadmap yet.
          </Text>
        ) : (
          <VStack as="ul" listStyleType="none" align="stretch" spacing={0} mt={3} mb={0} mx={0} p={0}>
            {active.map((item) => (
              <RoadmapItemRow
                key={item.id}
                id={item.id}
                number={item.number}
                title={item.title}
                description={item.description}
                status={item.status === 'in_progress' ? 'in_progress' : 'planned'}
                votes={item.votes}
              />
            ))}
          </VStack>
        )}
      </Box>

      <Box as="section" aria-labelledby="add-heading" {...CARD_PROPS}>
        <Text {...LABEL_PROPS} color="dustyRose" mb={3} id="add-heading">
          Add a roadmap item
        </Text>
        <AdminForm
          action={createRoadmapItemAction}
          rule={{ kind: 'feature' }}
          mode="create"
          submitLabel="Add to roadmap"
          submitVariant="solid"
          layout="custom"
        >
          <Input name="title" aria-label="Title" placeholder="Title" maxLength={FEATURE_TITLE_MAX} mb={2} {...FIELD_PROPS} />
          <Textarea
            name="description"
            aria-label="Description"
            placeholder="Description"
            maxLength={FEATURE_DESCRIPTION_MAX}
            rows={3}
            mb={3}
            {...FIELD_PROPS}
          />
          <AdminFormActions />
        </AdminForm>
      </Box>
    </VStack>
  )
}
