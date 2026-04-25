'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export const MenuRoot = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuPortal = DropdownMenu.Portal
export const MenuLabel = DropdownMenu.Label
export const MenuSeparator = DropdownMenu.Separator
export const MenuRadioGroup = DropdownMenu.RadioGroup

export function MenuContent({
  className,
  sideOffset = 10,
  ...props
}: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[220px] overflow-hidden rounded-[18px] border border-surface-border bg-surface-card/95 p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl outline-none',
          'data-[side=bottom]:origin-top data-[side=top]:origin-bottom',
          'data-[state=open]:animate-[noor-menu-in_160ms_ease-out] data-[state=closed]:animate-[noor-menu-out_140ms_ease-in] motion-reduce:animate-none',
          'dark:shadow-[0_24px_72px_rgba(0,0,0,0.45)]',
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

export function MenuRadioItem({
  className,
  inset,
  ...props
}: DropdownMenu.DropdownMenuRadioItemProps & { inset?: boolean }) {
  return (
    <DropdownMenu.RadioItem
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-[14px] px-3 py-2.5 text-[13px] text-ink-secondary outline-none',
        'transition-[background-color,color,transform] duration-150 ease-out',
        'focus:bg-surface-muted focus:text-ink-primary data-[state=checked]:bg-surface-muted/85 data-[state=checked]:text-ink-primary',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  )
}

export function MenuItemIndicator({
  className,
  ...props
}: DropdownMenu.DropdownMenuItemIndicatorProps) {
  return (
    <DropdownMenu.ItemIndicator
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    />
  )
}
