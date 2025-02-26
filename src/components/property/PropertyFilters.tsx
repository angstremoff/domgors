import { useState } from 'react'
import { Disclosure } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useProperties, Property } from '../../contexts/PropertyContext'

interface PropertyFiltersProps {
  type: 'sale' | 'rent'
  properties: Property[]
}

const saleFilters = [
  {
    id: 'property_type',
    name: 'Тип недвижимости',
    options: [
      { value: 'apartment', label: 'Квартира' },
      { value: 'house', label: 'Дом' },
      { value: 'commercial', label: 'Коммерческая' },
      { value: 'land', label: 'Земельный участок' },
    ],
  },
  {
    id: 'price',
    name: 'Цена',
    options: [
      { value: '0-100000', label: 'До 100,000 €' },
      { value: '100000-300000', label: '100,000 € - 300,000 €' },
      { value: '300000-500000', label: '300,000 € - 500,000 €' },
      { value: '500000-1000000', label: '500,000 € - 1,000,000 €' },
      { value: '1000000+', label: 'Более 1,000,000 €' },
    ],
  },
  {
    id: 'rooms',
    name: 'Количество комнат',
    options: [
      { value: '1', label: '1 комната' },
      { value: '2', label: '2 комнаты' },
      { value: '3', label: '3 комнаты' },
      { value: '4+', label: '4+ комнаты' },
    ],
  },
  {
    id: 'area',
    name: 'Площадь',
    options: [
      { value: '0-50', label: 'До 50 м²' },
      { value: '50-100', label: '50-100 м²' },
      { value: '100-200', label: '100-200 м²' },
      { value: '200+', label: 'Более 200 м²' },
    ],
  },
  {
    id: 'features',
    name: 'Особенности',
    options: [
      { value: 'parking', label: 'Парковка' },
      { value: 'balcony', label: 'Балкон' },
      { value: 'elevator', label: 'Лифт' },
      { value: 'furnished', label: 'С мебелью' },
    ],
  },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const rentFilters = [
  {
    id: 'property_type',
    name: 'Тип недвижимости',
    options: [
      { value: 'apartment', label: 'Квартира' },
      { value: 'house', label: 'Дом' },
      { value: 'commercial', label: 'Коммерческая' },
    ],
  },
  {
    id: 'price',
    name: 'Цена в месяц',
    options: [
      { value: '0-500', label: 'До 500 €' },
      { value: '500-1000', label: '500 € - 1,000 €' },
      { value: '1000-2000', label: '1,000 € - 2,000 €' },
      { value: '2000-3000', label: '2,000 € - 3,000 €' },
      { value: '3000+', label: 'Более 3,000 €' },
    ],
  },
  {
    id: 'rooms',
    name: 'Количество комнат',
    options: [
      { value: '1', label: '1 комната' },
      { value: '2', label: '2 комнаты' },
      { value: '3', label: '3 комнаты' },
      { value: '4+', label: '4+ комнаты' },
    ],
  },
  {
    id: 'area',
    name: 'Площадь',
    options: [
      { value: '0-40', label: 'До 40 м²' },
      { value: '40-60', label: '40-60 м²' },
      { value: '60-100', label: '60-100 м²' },
      { value: '100+', label: 'Более 100 м²' },
    ],
  },
  {
    id: 'features',
    name: 'Особенности',
    options: [
      { value: 'parking', label: 'Парковка' },
      { value: 'balcony', label: 'Балкон' },
      { value: 'elevator', label: 'Лифт' },
      { value: 'furnished', label: 'С мебелью' },
    ],
  },
]

export default function PropertyFilters({ type, properties }: PropertyFiltersProps) {
  const { setFilteredProperties } = useProperties()
  const [localFilters, setLocalFilters] = useState<Record<string, string[]>>({})

  const applyFilters = () => {
    console.log('Applying filters:', localFilters)
    console.log('Total properties before filtering:', properties.length)

    const filtered = properties.filter(property => {
      // First check if the property matches the transaction type (sale/rent)
      if (property.type !== type) return false;

      // Then check other filters
      for (const [filterId, values] of Object.entries(localFilters)) {
        if (!values || values.length === 0) continue;

        console.log(`Checking filter ${filterId} with values:`, values);
        console.log('Property values:', property);

        switch (filterId) {
          case 'property_type':
            const matchesType = values.includes(property.property_type);
            console.log(`Property type check: ${property.property_type}, matches: ${matchesType}`);
            if (!matchesType) return false;
            break;

          case 'price': {
            for (const range of values) {
              const [min, max] = range.split('-').map(Number)
              console.log(`Price range check: ${min}-${max}, property price: ${property.price}`)
              
              if (max) {
                if (property.price >= min && property.price <= max) {
                  break // Нашли подходящий диапазон
                }
              } else {
                // Для случаев "1000000+" или "3000+"
                if (property.price >= min) {
                  break // Подходит под диапазон "более X"
                }
              }
              
              if (range === values[values.length - 1]) {
                // Если это последний диапазон и мы до сих пор не нашли совпадение
                return false
              }
            }
            break
          }

          case 'rooms':
            const matchesRooms = values.includes(property.rooms?.toString())
            console.log(`Rooms check: ${property.rooms}, matches: ${matchesRooms}`)
            if (!matchesRooms) return false
            break

          case 'area': {
            for (const range of values) {
              const [min, max] = range.split('-').map(Number)
              console.log(`Area range check: ${min}-${max}, property area: ${property.area}`)
              
              if (max) {
                if (property.area >= min && property.area <= max) {
                  break
                }
              } else {
                if (property.area >= min) {
                  break
                }
              }
              
              if (range === values[values.length - 1]) {
                return false
              }
            }
            break
          }

          case 'features':
            if (!property.features) {
              console.log('Property has no features')
              return false
            }
            const hasFeatures = values.every(feature => property.features?.includes(feature) ?? false)
            console.log(`Features check: required ${values}, has ${property.features}, matches: ${hasFeatures}`)
            if (!hasFeatures) return false
            break
        }
      }
      return true
    })

    console.log('Filtered properties:', filtered.length)
    setFilteredProperties(filtered)
  }

  const handleFilterChange = (sectionId: string, value: string, checked: boolean) => {
    console.log(`Filter change: ${sectionId}, value: ${value}, checked: ${checked}`)
    setLocalFilters(prev => {
      const current = prev[sectionId] || []
      const updated = checked
        ? { ...prev, [sectionId]: [...current, value] }
        : { ...prev, [sectionId]: current.filter(v => v !== value) }
      console.log('Updated filters:', updated)
      return updated
    })
  }

  const currentFilters = type === 'sale' ? saleFilters : rentFilters

  return (
    <div className="space-y-4">
      {currentFilters.map((section) => (
        <Disclosure as="div" key={section.id} className="border-b border-gray-200 last:border-b-0">
          {({ open }) => (
            <>
              <h3 className="flow-root">
                <Disclosure.Button className="flex w-full items-center justify-between py-3 text-sm text-gray-900 hover:text-gray-500">
                  <span className="font-medium">{section.name}</span>
                  <span className="ml-6 flex items-center">
                    <ChevronDownIcon
                      className={classNames(open ? '-rotate-180' : 'rotate-0', 'h-5 w-5 transform text-gray-400')}
                      aria-hidden="true"
                    />
                  </span>
                </Disclosure.Button>
              </h3>
              <Disclosure.Panel className="pt-2 pb-4">
                <div className="space-y-3">
                  {section.options.map((option, optionIdx) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        id={`filter-${section.id}-${optionIdx}`}
                        name={`${section.id}[]`}
                        value={option.value}
                        type="checkbox"
                        checked={localFilters[section.id]?.includes(option.value) || false}
                        onChange={(e) => handleFilterChange(section.id, option.value, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <label
                        htmlFor={`filter-${section.id}-${optionIdx}`}
                        className="ml-3 text-sm text-gray-600"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      ))}
      <div className="pt-4">
        <button
          onClick={applyFilters}
          className="w-full bg-[#1E3A8A] text-white py-3 px-4 rounded-xl hover:bg-[#1E3A8A]/90 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
        >
          Применить фильтры
        </button>
      </div>
    </div>
  )
}
