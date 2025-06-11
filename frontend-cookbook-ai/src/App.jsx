// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './pages/MainLayout'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import PantryPage from './pages/PantryPage'
import PreferencesPage from './pages/PreferencesPage'
import ProfilePage from './pages/ProfilePage'
import useAuth from './hooks/useAuth'
import FavoritesPage from './pages/FavoritesPage'


const ProtectedRoute = ({ children }) => {
  const { getToken, isExpired, logout } = useAuth()
  const token = getToken()


  if (!token || isExpired()) {
    logout()
    alert('Tvoja sesija je istekla. Molimo prijavi se ponovno.')
    return <Navigate to="/auth" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route path="auth" element={<AuthPage />} />
        <Route
          index
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pantry"
          element={
            <ProtectedRoute>
              <PantryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="preferences"
          element={
            <ProtectedRoute>
              <PreferencesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
         path="favorites"
         element={
          <ProtectedRoute>
          <FavoritesPage />
          </ProtectedRoute>
  }
/>



        <Route
          path="chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
