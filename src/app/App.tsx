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
import { AuthorRequired } from '../auth/AuthorRequired'
import { AuthorProblemsPage } from '../pages/AuthorProblemsPage'
import { AuthorProblemEditorPage } from '../pages/AuthorProblemEditorPage'
import { SubmitProblemPage } from '../pages/SubmitProblemPage'

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
            path="author/problems"
            element={<AuthRequired><AuthorRequired><AuthorProblemsPage /></AuthorRequired></AuthRequired>}
          />
          <Route
            path="author/problems/new"
            element={<AuthRequired><AuthorRequired><AuthorProblemEditorPage /></AuthorRequired></AuthRequired>}
          />
          <Route
            path="author/problems/:problemId"
            element={<AuthRequired><AuthorRequired><AuthorProblemEditorPage /></AuthorRequired></AuthRequired>}
          />
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
          <Route
            path="problems/:problemId/submit"
            element={
              <AuthRequired>
                <SubmitProblemPage />
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
