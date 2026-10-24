'use client'

import { useState, useTransition } from 'react'
import { Box, Button, Flex, Heading, Input, Select, Text } from '@chakra-ui/react'
import { AdminForm } from '@/components/AdminForm'
import { CompletionChips, type Completion } from '@/components/CompletionChips'
import { LABEL_PROPS, FIELD_PROPS, SELECT_PROPS } from '@/components/adminStyles'
import { updateReadMonthAction, updateTotalChaptersAction } from '@/app/admin/actions'
import { MONTH_NAMES, formatReadMonth, readMonthYears, splitReadMonth } from '@/lib/read-month'

const SUBTITLE_PROPS = { fontFamily: 'heading', fontStyle: 'italic', fontSize: 'xl', color: 'mist' } as const

// Title, "Author, N chapters" and "Read in Month Year" (both edit in place), and the completion chips.
export function BookSetupHeader({
  bookId,
  title,
  author,
  totalChapters,
  minTotal,
  minNamed,
  readMonth,
  completion,
}: {
  bookId: string
  title: string
  author: string
  totalChapters: number
  minTotal: number
  minNamed: number
  readMonth: string | null
  completion: Completion
}) {
  const [editingTotal, setEditingTotal] = useState(false)
  const [editingMonth, setEditingMonth] = useState(false)
  const [clearing, startClearing] = useTransition()
  const close = () => setEditingTotal(false)
  const closeMonth = () => setEditingMonth(false)
  const parts = splitReadMonth(readMonth)

  function clearMonth() {
    startClearing(async () => {
      const formData = new FormData()
      formData.set('bookId', bookId)
      formData.set('month', '')
      formData.set('year', '')
      await updateReadMonthAction(formData)
    })
  }

  return (
    <Flex justify="space-between" align="flex-end" gap={4} wrap="wrap">
      <Box minW={0}>
        <Text {...LABEL_PROPS} color="dustyRose">
          Book setup
        </Text>
        <Heading as="h1" size="2xl" mt={1}>
          {title}
        </Heading>
        {editingTotal ? (
          <Box mt={2}>
            <AdminForm
              action={updateTotalChaptersAction}
              rule={{ kind: 'total', minTotal, minNamed }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId }}
              onSuccess={close}
              onCancel={close}
            >
              <Text {...SUBTITLE_PROPS}>{author},</Text>
              <Input {...FIELD_PROPS}
                name="totalChapters"
                type="number"
                min={1}
                defaultValue={totalChapters}
                aria-label="Total chapters"
                size="sm"
                w="90px"
                required
                autoFocus
              />
              <Text {...SUBTITLE_PROPS}>chapters</Text>
            </AdminForm>
          </Box>
        ) : (
          <Flex align="baseline" gap={3} mt={1} wrap="wrap">
            <Text {...SUBTITLE_PROPS}>
              {author}, {totalChapters} chapters
            </Text>
            <Button size="sm" variant="link" aria-label="Edit total chapters" onClick={() => setEditingTotal(true)}>
              Edit
            </Button>
          </Flex>
        )}
        {editingMonth ? (
          <Box mt={2}>
            <AdminForm
              action={updateReadMonthAction}
              rule={{ kind: 'readMonth' }}
              mode="edit"
              submitLabel="Save"
              hiddenFields={{ bookId }}
              onSuccess={closeMonth}
              onCancel={closeMonth}
            >
              <Text {...SUBTITLE_PROPS}>Read in</Text>
              <Select {...SELECT_PROPS} name="month" aria-label="Month read" size="sm" w="150px" defaultValue={parts.month} autoFocus>
                <option value="">Month</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={String(i + 1).padStart(2, '0')}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select {...SELECT_PROPS} name="year" aria-label="Year read" size="sm" w="100px" defaultValue={parts.year}>
                <option value="">Year</option>
                {readMonthYears().map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </Select>
            </AdminForm>
          </Box>
        ) : (
          <Flex align="baseline" gap={3} mt={1} wrap="wrap">
            <Text {...SUBTITLE_PROPS}>{readMonth ? `Read in ${formatReadMonth(readMonth)}` : 'Read in: not set'}</Text>
            <Button
              size="sm"
              variant="link"
              aria-label={readMonth ? 'Edit month read' : 'Set month read'}
              onClick={() => setEditingMonth(true)}
            >
              {readMonth ? 'Edit' : 'Set'}
            </Button>
            {readMonth && (
              <Button size="sm" variant="link" color="mist" aria-label="Clear month read" isDisabled={clearing} onClick={clearMonth}>
                Clear
              </Button>
            )}
          </Flex>
        )}
      </Box>
      <CompletionChips completion={completion} />
    </Flex>
  )
}
