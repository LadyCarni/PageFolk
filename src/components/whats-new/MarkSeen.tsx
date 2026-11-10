'use client'

import { useEffect } from 'react'
import { markWhatsNewSeenAction } from '@/app/whats-new/actions'

// Records the visit once, after the page has rendered with the previous value.
export function MarkSeen() {
  useEffect(() => {
    void markWhatsNewSeenAction()
  }, [])
  return null
}
