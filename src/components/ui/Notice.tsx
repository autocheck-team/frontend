import type { ReactNode, HTMLAttributes } from 'react'

interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  tone?: 'neutral' | 'error'
  children: ReactNode
}

export function Notice({ title, tone = 'neutral', children, className = '', ...props }: NoticeProps) {
  return (
    <div className={`notice notice-${tone} ${className}`.trim()} {...props}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  )
}
