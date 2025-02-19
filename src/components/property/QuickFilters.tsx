import { useNavigate } from 'react-router-dom'
import { HiOutlineHome, HiOutlineOfficeBuilding } from 'react-icons/hi'
import { BiBuildings } from 'react-icons/bi'
import { MdOutlineLandscape } from 'react-icons/md'

interface QuickFilterButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

const QuickFilterButton = ({ icon, label, onClick }: QuickFilterButtonProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="text-2xl text-indigo-600 mb-2">{icon}</div>
    <span className="text-sm text-gray-700 text-center">{label}</span>
  </button>
)

export default function QuickFilters() {
  const navigate = useNavigate()

  const filters = [
    // Аренда
    {
      icon: <BiBuildings />,
      label: 'Аренда квартир',
      onClick: () => navigate('/rent?propertyType=apartment')
    },
    {
      icon: <HiOutlineHome />,
      label: 'Аренда домов',
      onClick: () => navigate('/rent?propertyType=house')
    },
    {
      icon: <HiOutlineOfficeBuilding />,
      label: 'Аренда коммерческой',
      onClick: () => navigate('/rent?propertyType=commercial')
    },
    // Продажа
    {
      icon: <BiBuildings />,
      label: 'Продажа квартир',
      onClick: () => navigate('/buy?propertyType=apartment')
    },
    {
      icon: <HiOutlineHome />,
      label: 'Продажа домов',
      onClick: () => navigate('/buy?propertyType=house')
    },
    {
      icon: <HiOutlineOfficeBuilding />,
      label: 'Продажа коммерческой',
      onClick: () => navigate('/buy?propertyType=commercial')
    },
    {
      icon: <MdOutlineLandscape />,
      label: 'Земельные участки',
      onClick: () => navigate('/buy?propertyType=land')
    }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {filters.map((filter, index) => (
        <QuickFilterButton
          key={index}
          icon={filter.icon}
          label={filter.label}
          onClick={filter.onClick}
        />
      ))}
    </div>
  )
}
