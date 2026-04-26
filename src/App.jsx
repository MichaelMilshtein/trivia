import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import CategoriesPage from './pages/CategoriesPage'
import GamePage from './pages/GamePage'
import AdminPage from './pages/AdminPage'

function App() {
  const location = useLocation()
  const pageContainerClassName =
    location.pathname === '/admin' ? 'page-container page-container-wide' : 'page-container'

  return (
    <div className="app-shell">
      <NavBar />
      <main className={pageContainerClassName}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
