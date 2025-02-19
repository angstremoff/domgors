import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

const propertyTypes = [
  { id: 'all', name: 'Все типы' },
  { id: 'apartment', name: 'Квартиры' },
  { id: 'house', name: 'Дома' },
  { id: 'commercial', name: 'Коммерческая' },
]

const priceRanges = [
  { id: 'all', name: 'Любая цена' },
  { id: '0-50000', name: 'До 50,000 €' },
  { id: '50000-100000', name: 'От 50,000 € до 100,000 €' },
  { id: '100000-200000', name: 'От 100,000 € до 200,000 €' },
  { id: '200000+', name: 'От 200,000 €' },
]

export default function PropertySearch() {
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('all')
  const [priceRange, setPriceRange] = useState('all')

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="mt-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:p-6">

        <div className="sm:w-48">
          <label htmlFor="property-type" className="sr-only">
            Тип недвижимости
          </label>
          <select
            id="property-type"
            name="property-type"
            className="block w-full rounded-md border-0 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            {propertyTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-64">
          <label htmlFor="price-range" className="sr-only">
            Ценовой диапазон
          </label>
          <select
            id="price-range"
            name="price-range"
            className="block w-full rounded-md border-0 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
          >
            {priceRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Найти
        </button>
      </div>
    </div>
  )
}
