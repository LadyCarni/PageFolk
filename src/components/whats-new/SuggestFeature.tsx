'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Box, Button, Flex, Heading, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { submitFeatureRequestAction } from '@/app/whats-new/actions'
import { FEATURE_DESCRIPTION_MAX, FEATURE_TITLE_MAX } from '@/lib/limits'

// The "Coming up" heading row with the Suggest a feature button, and the inline form it opens.
export function SuggestFeature() {
  const [open, setOpen] = useState(false)
  const [thanks, setThanks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        const result = await submitFeatureRequestAction(data)
        if (result.error) {
          setError(result.error)
          return
        }
        setOpen(false)
        setThanks(true)
      } catch {
        setError('Could not send your idea. Try again.')
      }
    })
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" gap={3}>
        <Heading as="h2" size="lg">
          Coming up
        </Heading>
        {!open && (
          <Button
            variant="goldOutline"
            size="sm"
            onClick={() => {
              setOpen(true)
              setThanks(false)
              setError(null)
            }}
          >
            Suggest a feature
          </Button>
        )}
      </Flex>
      {thanks && (
        <Text mt={3} color="statusGreen" role="status">
          Thanks! Your idea is in for review.
        </Text>
      )}
      {open && (
        <Box as="form" onSubmit={onSubmit} mt={4} p={4} bg="velvet" borderWidth="1px" borderColor="border" borderRadius="xl">
          <VStack align="stretch" spacing={3}>
            <Input name="title" aria-label="Feature title" placeholder="What feature would you like to see?" maxLength={FEATURE_TITLE_MAX} />
            <Textarea
              name="description"
              aria-label="Feature description"
              rows={4}
              maxLength={FEATURE_DESCRIPTION_MAX}
              placeholder="Describe what the feature does? What other apps have you used that has this feature, as an example?"
            />
            {error && (
              <Text color="danger" role="alert" fontSize="sm">
                {error}
              </Text>
            )}
            <Flex gap={3} align="center">
              <Button type="submit" isLoading={pending}>
                Submit Feature Request
              </Button>
              <Button type="button" variant="link" onClick={() => {
                  setOpen(false)
                  setError(null)
                }} isDisabled={pending}>
                Cancel
              </Button>
            </Flex>
            <Text fontSize="sm" color="mist">
              Every feature request is reviewed. Thank you for your idea!
            </Text>
          </VStack>
        </Box>
      )}
    </Box>
  )
}
