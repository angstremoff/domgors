import { FaApple, FaGooglePlay } from 'react-icons/fa'
import { MdEmail } from 'react-icons/md'
import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-gradient-to-br from-slate-50 to-slate-100 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Mobile Apps */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-start">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('footer.mobileApps')}</h3>
            <div className="flex gap-3 w-full max-w-xs">
              <div 
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-70 grayscale text-sm font-medium"
                title={t('footer.iosAppComingSoon')}
              >
                <FaApple className="w-4 h-4 mr-2" />
                iOS
              </div>
              <a 
                href="https://github.com/angstremoff/domgomobile/releases/latest/download/DomGo-v0.7.0.apk" 
                download="DomGo.apk"
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 transition-colors text-sm font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = 'https://github.com/angstremoff/domgomobile/releases/latest/download/DomGo-v0.7.0.apk';
                }}
              >
                <FaGooglePlay className="w-4 h-4 mr-2" />
                Android
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-start">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('footer.contacts')}</h3>
            <a 
              href="mailto:admin@domgo.rs" 
              className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
            >
              <MdEmail className="w-4 h-4 mr-2" />
              admin@domgo.rs
            </a>
          </div>

          {/* Developer Info */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-start">
            <h3 className="text-base font-semibold text-gray-900 mb-4">{t('footer.developedBy')}</h3>
            <a 
              href="https://angstremoff.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
            >
              с ❤ от AngstremoFF
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
