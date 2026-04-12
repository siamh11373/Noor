'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

function getSpeechRecognition() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function useSpeechCapture() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()))
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [])

  const startListening = useCallback(() => {
    const Recognition = getSpeechRecognition()

    if (!Recognition) {
      setError('Voice capture is not supported in this browser.')
      return
    }

    recognitionRef.current?.stop()

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = event => {
      const nextTranscript = Array.from({ length: event.results.length }, (_, index) => event.results[index]?.[0]?.transcript ?? '')
        .join(' ')
        .trim()

      setTranscript(nextTranscript)
    }

    recognition.onerror = () => {
      setError('Voice capture could not understand that. You can type instead.')
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    setError(null)
    setListening(true)
    recognition.start()
    recognitionRef.current = recognition
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setTranscript('')
    setListening(false)
    setError(null)
  }, [])

  return {
    transcript,
    setTranscript,
    listening,
    supported,
    error,
    startListening,
    stopListening,
    reset,
  }
}
