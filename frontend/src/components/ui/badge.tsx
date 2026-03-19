import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline:   'border text-foreground',
        analyzed:  'bg-gray-100 text-gray-600',
        exported:  'bg-blue-50 text-blue-700',
        applied:   'bg-indigo-50 text-indigo-700',
        interview: 'bg-green-50 text-green-700',
        rejected:  'bg-red-50 text-red-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
