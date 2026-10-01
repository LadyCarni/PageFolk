import { Box, Flex, Heading, List, ListItem } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots } from '@fortawesome/free-solid-svg-icons'

const PROMPTS = [
  'Who is your favorite character so far and why?',
  'Which character did you relate to or empathize with the most and why?',
  'What was the most memorable or shocking scene or twist in the story and why?',
  'How did this section speed up, slow down, or change the vibe of the story for you?',
  'What choice did the main character make in these chapters, and would you have done the same thing?',
  'Whose perspective or motives do you still feel unsure about right now?',
  'Where did you feel the most tension or suspense while reading this section?',
]

export function DiscussionPromptCard() {
  return (
    <Box borderWidth="1px" borderColor="border" borderRadius="lg" bg="velvet" overflow="hidden">
      <Flex as="header" align="center" gap={2} bg="claret" color="parchment" px={4} py={3}>
        <FontAwesomeIcon icon={faCommentDots} />
        <Heading as="h2" size="sm">
          What do you think?
        </Heading>
      </Flex>
      <List spacing={4} p={4} color="body">
        {PROMPTS.map((prompt) => (
          <ListItem key={prompt}>{prompt}</ListItem>
        ))}
      </List>
    </Box>
  )
}
