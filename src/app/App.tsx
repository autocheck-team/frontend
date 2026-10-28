import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthRequired } from '../auth/AuthRequired'
import { AppLayout } from '../components/AppLayout'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<PlaceholderPage title="Регистрация" task="HPPR-22" />} />
          <Route
            path="problems"
            element={
              <AuthRequired>
                <PlaceholderPage title="Задания" task="HPPR-21" />
              </AuthRequired>
            }
          />
          <Route
            path="problems/:problemId"
            element={
              <AuthRequired>
                <PlaceholderPage title="Задание" task="HPPR-21" />
              </AuthRequired>
            }
          />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
