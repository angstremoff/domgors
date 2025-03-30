import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import FavoriteIcon from './FavoriteIcon'
import LanguageSelector from './LanguageSelector'
import { useTranslation } from 'react-i18next'

const getNavigation = (pathname: string, t: (key: string) => string) => [
  { name: t('transactionTypes.rent'), href: '/rent', current: pathname === '/rent' },
  { name: t('transactionTypes.sale'), href: '/buy', current: pathname === '/buy' }
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import LoginModal from '../auth/LoginModal'
import AddPropertyModal from '../property/AddPropertyModal'

export default function Header() {
  const { user, logout } = useAuth()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false)
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const navigation = getNavigation(pathname, t)
  return (
    <>
      <Disclosure as="nav" className="bg-[#1E3A8A] shadow-md sticky top-0 z-50">
        {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/" className="text-2xl font-bold text-white hover:text-accent-200 transition-colors">
                    DomGo
                  </Link>
                </div>
                <div className="hidden sm:ml-8 sm:flex sm:items-center sm:space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        'inline-flex items-center px-4 py-2 rounded-lg text-base font-medium transition-all duration-200',
                        item.current
                          ? 'bg-secondary-600 text-white shadow-md hover:bg-secondary-700'
                          : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/20'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {user && (
                  <>
                  <button
                    onClick={() => setIsAddPropertyModalOpen(true)}
                    className="text-white/80 hover:text-white inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/10 hover:bg-white/20 backdrop-blur-sm mr-3"
                  >
                    {t('common.addListing')}
                  </button>
                  <Link
                    to="/profile/listings"
                    className="text-white/80 hover:text-white inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/10 hover:bg-white/20 backdrop-blur-sm mr-3"
                  >
                    {t('profile.myProperties')}
                  </Link>
                  </>
                )}
                <div className="mr-3">
                  <FavoriteIcon />
                </div>
                <div className="mr-3">
                  <LanguageSelector />
                </div>

                {user ? (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white/10 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2">
                        <span className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-white hover:text-white/90">
                          {user.email}
                        </span>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/profile"
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              {t('common.profile')}
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={logout}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block w-full text-left px-4 py-2 text-sm text-gray-700'
                              )}
                            >
                              {t('common.logout')}
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-white/80 hover:text-white inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                  >
                    {t('common.login')}
                  </button>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                  <span className="sr-only">{t('common.openMenu')}</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile menu panel */}
          <Disclosure.Panel className="sm:hidden bg-[#1E3A8A]">
            <div className="space-y-1 px-4 pb-3 pt-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={classNames(
                    'block rounded-md px-3 py-2 text-base font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20',
                    item.current ? 'bg-secondary-600 text-white shadow-md hover:bg-secondary-700 border-none' : ''
                  )}
                >
                  {item.name}
                </Link>
              ))}
              {user && (
                <>
                <button
                  onClick={() => setIsAddPropertyModalOpen(true)}
                  className="w-full text-left block rounded-md px-3 py-2 text-base font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                >
                  {t('common.addListing')}
                </button>
                <Link
                  to="/profile/listings"
                  className="w-full text-left block rounded-md px-3 py-2 text-base font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                >
                  {t('profile.myProperties')}
                </Link>
                </>
              )}
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="w-1/2 flex justify-center">
                  <Link to="/favorites" className="w-full h-12 rounded-md flex items-center justify-center text-white bg-white/10 backdrop-blur-sm border border-white/20">
                    <FavoriteIcon />
                  </Link>
                </div>
                <div className="w-1/2 flex justify-center">
                  <div className="w-full h-12 rounded-md flex items-center justify-center text-white bg-white/10 backdrop-blur-sm border border-white/20">
                    <LanguageSelector />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-white/20 pb-3 pt-4">
              <div className="space-y-1 px-4">
                {user ? (
                  <>
                    <div className="text-base font-medium text-white mb-2 px-3">{user.email}</div>
                    <Link
                      to="/profile"
                      className="block rounded-md px-3 py-2 text-base font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                    >
                      {t('common.profile')}
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left block rounded-md px-3 py-2 text-base font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                    >
                      {t('common.logout')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-full text-left block rounded-md px-3 py-2 text-base font-medium text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                  >
                    {t('common.login')}
                  </button>
                )}
              </div>
            </div>
          </Disclosure.Panel>
        </>
        )}
      </Disclosure>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <AddPropertyModal isOpen={isAddPropertyModalOpen} onClose={() => setIsAddPropertyModalOpen(false)} />
    </>
  )
}
