'use client'

import { useEffect } from 'react'

export function LandingSmoothScroll() {
  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'smooth'

    return () => {
      document.documentElement.style.scrollBehavior = previous
    }
  }, [])

  return null
}
