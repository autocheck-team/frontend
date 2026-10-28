import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthRequired } from '../auth/AuthRequired'
import { AppLayout } from '../components/AppLayout'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProblemsPage } from '../pages/ProblemsPage'
import { ProblemPage } from '../pages/ProblemPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="problems"
            element={
              <AuthRequired>
                <ProblemsPage />
              </AuthRequired>
            }
          />
          <Route
            path="problems/:problemId"
            element={
              <AuthRequired>
                <ProblemPage />
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
