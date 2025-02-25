import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import FavoriteIcon from './FavoriteIcon'

const getNavigation = (pathname: string) => [
  { name: 'Аренда', href: '/rent', current: pathname === '/rent' },
  { name: 'Продажа', href: '/buy', current: pathname === '/buy' }
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
  const navigation = getNavigation(pathname)
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
                  <button
                    onClick={() => setIsAddPropertyModalOpen(true)}
                    className="text-white/80 hover:text-white inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-white/10 hover:bg-white/20 backdrop-blur-sm mr-3"
                  >
                    Добавить объявление
                  </button>
                )}
                <div className="mr-3">
                  <FavoriteIcon />
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
                              Профиль
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
                              Выйти
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
                    Войти
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
        )}
      </Disclosure>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <AddPropertyModal isOpen={isAddPropertyModalOpen} onClose={() => setIsAddPropertyModalOpen(false)} />
    </>
  )
}
