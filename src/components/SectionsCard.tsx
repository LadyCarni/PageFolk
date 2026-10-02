'use client'

import { useState } from 'react'
import { Box, Button, Flex, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { AdminForm, AdminFormActions } from '@/components/AdminForm'
import { CoverageBar } from '@/components/CoverageBar'
import { DeleteSectionButton } from '@/components/DeleteSectionButton'
import { CARD_PROPS, LABEL_PROPS, FIELD_PROPS } from '@/components/adminStyles'
import {
  chapterCoverage,
  chapterRangeName,
  coverageSummary,
  sectionDisplayName,
  type FormRule,
} from '@/lib/chapters'
import type { FormResult } from '@/app/admin/actions'
import { addSectionAction, deleteSectionAction, updateSectionAction } from '@/app/admin/actions'

export type SectionRowData = {
  id: string
  startChapter: number
  endChapter: number
  title: string | null
  postCount: number
}

const ROW_PROPS = { p: 5, bg: 'mulberry', borderWidth: '1px', borderColor: 'borderOpen', borderRadius: 'xl' } as const

function NumberField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number }) {
  return (
    <Box as="label" display="block" w="90px">
      <Text fontSize="sm" color="parchment" mb={1}>
        {label}
      </Text>
      <Input {...FIELD_PROPS} name={name} type="number" min={1} defaultValue={defaultValue} required />
    </Box>
  )
}

function SectionForm({
  action,
  mode,
  rule,
  hiddenFields,
  submitLabel,
  defaults,
  onDone,
}: {
  action: (formData: FormData) => Promise<FormResult>
  mode: 'edit' | 'create'
  rule: FormRule
  hiddenFields: Record<string, string>
  submitLabel: string
  defaults: { start?: number; end?: number; title: string }
  onDone: () => void
}) {
  return (
    <AdminForm
      action={action}
      rule={rule}
      mode={mode}
      submitLabel={submitLabel}
      submitVariant="solid"
      hiddenFields={hiddenFields}
      onSuccess={onDone}
      onCancel={onDone}
      layout="custom"
    >
      <Flex gap={3} align="flex-end" wrap="wrap">
        <NumberField label="From" name="startChapter" defaultValue={defaults.start} />
        <NumberField label="To" name="endChapter" defaultValue={defaults.end} />
        <Box as="label" display="block" flex="1" minW="160px">
          <Text fontSize="sm" color="parchment" mb={1}>
            Title (optional)
          </Text>
          <Input {...FIELD_PROPS} name="title" defaultValue={defaults.title} placeholder="e.g. Lowood" />
        </Box>
        <AdminFormActions />
      </Flex>
    </AdminForm>
  )
}

// Sections, the bar showing how much of the book they cover, and inline add and edit.
// One form is open at a time: a row being edited, or the new-section form ("new").
export function SectionsCard({
  bookId,
  totalChapters,
  sections,
}: {
  bookId: string
  totalChapters: number
  sections: SectionRowData[]
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const close = () => setEditing(null)
  const coverage = chapterCoverage(totalChapters, sections)
  const summary = coverageSummary(coverage)
  const ranges = sections.map(({ id, startChapter, endChapter, title }) => ({ id, startChapter, endChapter, title }))

  return (
    <Box as="section" id="sections" aria-labelledby="sections-heading" scrollMarginTop={6} {...CARD_PROPS}>
      <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
        <Box maxW="lg">
          <Heading as="h2" id="sections-heading" size="lg">
            Discussion sections
          </Heading>
          <Text color="mist" mt={2}>
            Each section becomes a conversation thread. Readers unlock it by finishing its last chapter. A name stays
            hidden until then.
          </Text>
        </Box>
        <Button
          leftIcon={<FontAwesomeIcon icon={faPlus} />}
          borderRadius="full"
          px={6}
          onClick={() => setEditing('new')}
          isDisabled={editing === 'new'}
        >
          Add section
        </Button>
      </Flex>

      <Box mt={6}>
        <CoverageBar coverage={coverage} label={`${summary.lead} ${summary.rest}`.trim()} />
        <Text mt={3} fontSize="sm">
          <Text as="strong" color="parchment" fontWeight={600}>
            {summary.lead}
          </Text>
          {summary.rest && ` ${summary.rest}`}
        </Text>
      </Box>

      <VStack as="ul" listStyleType="none" align="stretch" spacing={4} mt={6} mb={0} mx={0} p={0}>
        {editing === 'new' && (
          <Box as="li" {...ROW_PROPS} borderColor="antiqueGold">
            <Text {...LABEL_PROPS} color="antiqueGold" mb={3}>
              New section
            </Text>
            <SectionForm
              action={addSectionAction}
              mode="create"
              rule={{ kind: 'section', totalChapters, others: ranges }}
              hiddenFields={{ bookId }}
              submitLabel="Add section"
              defaults={{ start: coverage.gaps[0]?.start, title: '' }}
              onDone={close}
            />
          </Box>
        )}
        {sections.map((s) => {
          const range = chapterRangeName(s.startChapter, s.endChapter)
          if (editing === s.id) {
            return (
              <Box as="li" key={s.id} {...ROW_PROPS} borderColor="antiqueGold">
                <Text {...LABEL_PROPS} color="antiqueGold" mb={3}>
                  {range}
                </Text>
                <SectionForm
                  action={updateSectionAction}
                  mode="edit"
                  rule={{ kind: 'section', totalChapters, others: ranges, ignoreId: s.id }}
                  hiddenFields={{ sectionId: s.id }}
                  submitLabel="Save"
                  defaults={{ start: s.startChapter, end: s.endChapter, title: s.title ?? '' }}
                  onDone={close}
                />
              </Box>
            )
          }
          return (
            <Flex as="li" key={s.id} {...ROW_PROPS} justify="space-between" align="center" gap={4} wrap="wrap">
              <Box minW={0}>
                <Text {...LABEL_PROPS} color="antiqueGold">
                  {range}
                </Text>
                <Text fontFamily="heading" fontSize="2xl" fontWeight={600} color="parchment">
                  {s.title?.trim() || range}
                </Text>
              </Box>
              <HStack spacing={3} flexShrink={0}>
                <Button
                  size="sm"
                  variant="goldOutline"
                  aria-label={`Edit ${sectionDisplayName(s)}`}
                  onClick={() => setEditing(s.id)}
                >
                  Edit
                </Button>
                <DeleteSectionButton
                  label={sectionDisplayName(s)}
                  postCount={s.postCount}
                  action={() => deleteSectionAction(s.id)}
                />
              </HStack>
            </Flex>
          )
        })}
      </VStack>
    </Box>
  )
}
