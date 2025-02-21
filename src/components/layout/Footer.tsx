import { FaApple, FaGooglePlay } from 'react-icons/fa'
import { MdEmail } from 'react-icons/md'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-50 to-slate-100 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Mobile Apps */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-start">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Мобильные приложения</h3>
            <div className="flex gap-3 w-full max-w-xs">
              <a 
                href="#" 
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 transition-colors text-sm font-medium"
              >
                <FaApple className="w-4 h-4 mr-2" />
                iOS
              </a>
              <a 
                href="#" 
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 transition-colors text-sm font-medium"
              >
                <FaGooglePlay className="w-4 h-4 mr-2" />
                Android
              </a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="w-full md:w-auto flex flex-col items-center md:items-start">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Контакты</h3>
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
            <h3 className="text-base font-semibold text-gray-900 mb-4">Разработано</h3>
            <a 
              href="mailto:angstremoff@ya.ru" 
              className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
            >
              <MdEmail className="w-4 h-4 mr-2" />
              Angstremoff
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
