import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ComponentProps } from 'react'

export function LoaderIcon({
  className,
  pulse = false,
  ...props
}: ComponentProps<typeof Loader2> & { pulse?: boolean }) {
  return (
    <Loader2
      className={cn('animate-spin', pulse && 'animate-pulse', className)}
      {...props}
    />
  )
}
