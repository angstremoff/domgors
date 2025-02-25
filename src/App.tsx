import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import HomePage from './pages/HomePage'
import RentPage from './pages/RentPage'
import SalePage from './pages/SalePage'
import FavoritesPage from './pages/FavoritesPage'
import ProfilePage from './components/profile/ProfilePage'
import { AuthProvider } from './contexts/AuthContext'
import { PropertyProvider } from './contexts/PropertyContext'
import { FavoritesProvider } from './contexts/FavoritesContext'

export default function App() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <FavoritesProvider>
          <Router>
            <div className="min-h-screen bg-[#FAFAFA]">
              <Header />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/rent" element={<RentPage />} />
                <Route path="/buy" element={<SalePage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Routes>
            </div>
          </Router>
        </FavoritesProvider>
      </PropertyProvider>
    </AuthProvider>
  )
}
