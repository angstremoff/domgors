import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { useAuth } from '../../contexts/AuthContext'
import RegisterModal from './RegisterModal'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showRegister, setShowRegister] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      await login(email, password)
      onClose()
    } catch (err) {
      setError('Неверный email или пароль')
    }
  }

  const handleRegisterClick = () => {
    setShowRegister(true)
  }

  if (showRegister) {
    return <RegisterModal isOpen={isOpen} onClose={() => {
      setShowRegister(false)
      onClose()
    }} />
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full bg-white rounded-xl shadow-lg relative z-50">
          <div className="px-6 py-5 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Вход в аккаунт
            </Dialog.Title>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 
                           focus:border-secondary-600 focus:outline-none focus:ring-1 focus:ring-secondary-600 
                           sm:text-sm bg-white/50"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Пароль
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 
                           focus:border-secondary-600 focus:outline-none focus:ring-1 focus:ring-secondary-600 
                           sm:text-sm bg-white/50"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col space-y-4">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white 
                         hover:bg-gray-800"
                >
                  Войти
                </button>
              </div>
              <div className="text-center text-sm text-gray-600">
                Нет аккаунта?{' '}
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="text-secondary-600 hover:text-secondary-500 font-medium"
                >
                  Зарегистрироваться
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
