import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from './ui/Button'

export function AppLayout() {
  const auth = useAuth()
  return (
    <div className="app-frame">
      <header className="site-header">
        <div className="header-inner">
          <NavLink className="brand" to="/" aria-label="На главную">
            <span className="brand-mark" aria-hidden="true">A</span>

          </NavLink>
          <nav className="main-nav" aria-label="Основная навигация">
            <NavLink to="/problems">Задания</NavLink>
            {auth.status === 'authenticated' ? (
              <Button className="nav-account-button" onClick={() => void auth.logout()}>Выйти</Button>
            ) : (
              <NavLink className="nav-account" to="/login">Войти <span aria-hidden="true">↗</span></NavLink>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer"><span>Среда для проверки программных решений</span></footer>
    </div>
  )
}
