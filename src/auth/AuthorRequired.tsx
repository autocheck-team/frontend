import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'
import { Notice } from '../components/ui/Notice'

export function AuthorRequired({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.hasRole('author') || auth.hasRole('admin')) return children

  return (
    <main className="page-shell narrow-page">
      <Notice title="Нет доступа к кабинету автора" tone="error" role="alert">
        Для управления заданиями нужна роль автора. <Link className="text-link" to="/problems">Вернуться к заданиям</Link>
      </Notice>
    </main>
  )
}
