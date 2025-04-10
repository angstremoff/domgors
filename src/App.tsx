import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import HomePage from './pages/HomePage'
import RentPage from './pages/RentPage'
import SalePage from './pages/SalePage'
import FavoritesPage from './pages/FavoritesPage'
import ProfilePage from './components/profile/ProfilePage'
import AuthCallback from './components/auth/AuthCallback'
import { AuthProvider } from './contexts/AuthContext'
import { PropertyProvider } from './contexts/PropertyContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { CityProvider } from './contexts/CityContext'
import { HelmetProvider } from 'react-helmet-async'
import { useEffect } from 'react'
import NotFoundPage from './pages/NotFoundPage'
import Analytics from './components/Analytics'

// Функция для перенаправления с domgors.onrender.com на domgo.rs
const useRedirectToPrimaryDomain = () => {
  useEffect(() => {
    // Сначала проверяем через window.location.hostname
    const hostname = window.location.hostname;
    const primaryDomain = 'domgo.rs';
    const devDomain = 'domgors.onrender.com';
    
    console.log('Current hostname:', hostname); // Логирование для отладки
    
    // Немедленный редирект для домена разработки
    if (hostname === devDomain) {
      console.log('Redirecting from dev domain to primary domain');
      const newUrl = `https://${primaryDomain}${window.location.pathname}${window.location.search}`;
      console.log('Redirect URL:', newUrl);
      
      // Используем более приоритетный метод редиректа
      window.location.replace(newUrl);
      return;
    }
    
    // Альтернативная проверка через document.referrer
    if (document.referrer.includes(devDomain)) {
      console.log('Referrer contains dev domain, redirecting');
      const newUrl = `https://${primaryDomain}${window.location.pathname}${window.location.search}`;
      window.location.replace(newUrl);
      return;
    }
  }, []);
};

export default function App() {
  // Сначала вызываем редирект, перед рендерингом приложения
  useRedirectToPrimaryDomain();
  
  return (
    <HelmetProvider>
      <LanguageProvider>
        <AuthProvider>
          <CityProvider>
            <PropertyProvider>
              <FavoritesProvider>
              <Router>
                <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
                  <Header />
                  <Analytics />
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/rent" element={<RentPage />} />
                    <Route path="/buy" element={<SalePage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/profile/listings" element={<ProfilePage activeTab="listings" />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </div>
              </Router>
              </FavoritesProvider>
            </PropertyProvider>
          </CityProvider>
        </AuthProvider>
      </LanguageProvider>
    </HelmetProvider>
  )
}
