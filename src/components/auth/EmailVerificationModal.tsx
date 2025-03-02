import { Dialog } from '@headlessui/react'

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
}

export default function EmailVerificationModal({ isOpen, onClose, email }: EmailVerificationModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full bg-white rounded-xl shadow-lg relative z-50">
          <div className="px-6 py-5 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Подтвердите ваш email
            </Dialog.Title>
          </div>

          <div className="p-6">
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                На ваш email <span className="font-medium">{email}</span> было отправлено письмо с ссылкой для подтверждения.
              </p>
              <p className="text-gray-600">
                Пожалуйста, проверьте вашу почту и перейдите по ссылке для завершения регистрации.
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Закрыть
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}