import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useLanguage } from '../../contexts/LanguageContext'
import ruFlag from '../../assets/flags/ru.svg'
import srFlag from '../../assets/flags/sr.svg'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const languages = [
    { code: 'ru', label: 'Русский', flag: ruFlag },
    { code: 'sr', label: 'Srpski', flag: srFlag },
  ]

  const currentLanguage = languages.find(l => l.code === language)

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center justify-center text-white hover:opacity-80 transition-opacity">
          <img
            src={currentLanguage?.flag}
            alt={currentLanguage?.label}
            className="h-6 w-6 rounded-full object-cover"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mb-2 w-32 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:mt-2 sm:mb-0 bottom-full sm:bottom-auto sm:top-auto">
          <div className="py-1">
            {languages.map((lang) => (
              <Menu.Item key={lang.code}>
                {({ active }) => (
                  <button
                    onClick={() => setLanguage(lang.code as 'ru' | 'sr')}
                    className={classNames(
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                      'block w-full px-4 py-2 text-left text-sm flex items-center gap-2'
                    )}
                  >
                    <img
                      src={lang.flag}
                      alt={lang.code}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    {lang.label}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}