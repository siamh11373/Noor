import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// SECURITY FIX: centralized safe-redirect validator to prevent open redirect attacks.
// startsWith('/') alone is insufficient — '//evil.com' and '/\evil.com' also start with '/'.
// Used by auth callback and auth pages to validate the 'next' redirect parameter.
export function isSafeRedirect(value: string | null | undefined): value is string {
  if (!value) return false
  if (!value.startsWith('/')) return false
  // Block protocol-relative URLs (//evil.com) and backslash tricks (/\evil.com)
  if (value.startsWith('//') || value.startsWith('/\\')) return false
  try {
    // Parse as absolute URL anchored to a dummy origin; if the origin shifts, it's unsafe
    const parsed = new URL(value, 'https://placeholder.invalid')
    return parsed.origin === 'https://placeholder.invalid'
  } catch {
    return false
  }
}
