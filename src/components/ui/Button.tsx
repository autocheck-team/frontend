import { Link, type LinkProps } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function Button({ children, className = '', ...props }: ButtonProps) {
  return <button className={`button ${className}`.trim()} {...props}>{children}</button>
}

export function ButtonLink({ children, ...props }: LinkProps & { children: ReactNode }) {
  return <Link className="button button-link" {...props}>{children}</Link>
}
