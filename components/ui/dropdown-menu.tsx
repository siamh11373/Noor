'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export const MenuRoot = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuPortal = DropdownMenu.Portal
export const MenuSeparator = DropdownMenu.Separator

export function MenuContent({
  className,
  sideOffset = 8,
  ...props
}: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[220px] rounded-xl border border-surface-border bg-surface-card p-1.5 shadow-xl outline-none',
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

export function MenuItem({
  className,
  inset,
  ...props
}: DropdownMenu.DropdownMenuItemProps & { inset?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-[13px] text-ink-secondary outline-none transition-colors focus:bg-surface-muted focus:text-ink-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  )
}
