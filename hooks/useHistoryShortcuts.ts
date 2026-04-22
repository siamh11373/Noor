'use client'

import { useShortcut } from '@/hooks/useShortcuts'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { toast } from '@/components/ui/toast-host'

/**
 * Registers Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y (redo)
 * against the zundo temporal store. Auto-disabled inside form fields so
 * native browser undo still wins when the user is typing.
 */
export function useHistoryShortcuts() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  useShortcut('mod+z', (e) => {
    e.preventDefault()
    if (!canUndo) {
      toast.show('Nothing to undo', { tone: 'neutral', durationMs: 1400 })
      return
    }
    undo()
    toast.show('Undid last change', {
      tone: 'success',
      durationMs: 1800,
      actionLabel: 'Redo',
      onAction: () => redo(),
    })
  }, { preventDefault: true }, [undo, redo, canUndo])

  useShortcut(['mod+shift+z', 'mod+y'], (e) => {
    e.preventDefault()
    if (!canRedo) {
      toast.show('Nothing to redo', { tone: 'neutral', durationMs: 1400 })
      return
    }
    redo()
    toast.show('Redid change', { tone: 'success', durationMs: 1400 })
  }, { preventDefault: true }, [redo, canRedo])
}
