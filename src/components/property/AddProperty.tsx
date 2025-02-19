import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import AddPropertyModal from './AddPropertyModal'

export default function AddProperty() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!user) return null

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Добавить объявление
      </button>
      <AddPropertyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
