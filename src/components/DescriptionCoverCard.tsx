import { Box, Grid, Heading, Text, Textarea } from '@chakra-ui/react'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { CoverImage } from '@/components/CoverImage'
import { CoverUpload } from '@/components/CoverUpload'
import { CARD_PROPS, FIELD_PROPS } from '@/components/adminStyles'
import { removeCoverAction, updateBlurbAction, uploadCoverAction } from '@/app/admin/actions'

export function DescriptionCoverCard({
  book,
  coverVersion,
}: {
  book: { id: string; title: string; author: string; blurb: string | null }
  coverVersion: number | null
}) {
  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 240px' }} gap={8} {...CARD_PROPS}>
      <Box as="section" id="description" aria-labelledby="description-heading" scrollMarginTop={6}>
        <Heading as="h2" id="description-heading" size="lg">
          Description
        </Heading>
        <Text color="mist" mt={2} mb={4}>
          Shown on the book page. Keep it spoiler-free.
        </Text>
        <AdminForm
          key={book.id}
          action={updateBlurbAction}
          rule={{ kind: 'blurb' }}
          mode="edit"
          submitLabel="Save description"
          submitVariant="solid"
          showSaved
          hiddenFields={{ bookId: book.id }}
          layout="custom"
        >
          <Textarea {...FIELD_PROPS}
            name="blurb"
            defaultValue={book.blurb ?? ''}
            placeholder="A few spoiler-free lines about the book"
            aria-label="Description"
            rows={7}
            borderRadius="xl"
          />
          <Box mt={4}>
            <AdminFormActions />
          </Box>
        </AdminForm>
      </Box>
      <Box as="section" id="cover" aria-labelledby="cover-heading" scrollMarginTop={6}>
        <Heading as="h2" id="cover-heading" size="lg" mb={4}>
          Cover
        </Heading>
        <CoverImage book={book} coverVersion={coverVersion} width="200px" />
        {coverVersion === null && (
          <Text fontSize="sm" color="mist" mt={3}>
            No cover yet. This placeholder is shown instead.
          </Text>
        )}
        <CoverUpload
          bookId={book.id}
          title={book.title}
          hasCover={coverVersion !== null}
          uploadAction={uploadCoverAction}
          removeAction={async () => {
            'use server'
            await removeCoverAction(book.id)
          }}
        />
      </Box>
    </Grid>
  )
}
