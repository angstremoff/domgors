import { useState } from 'react'
import { Disclosure } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useProperties, Property } from '../../contexts/PropertyContext'
import { useTranslation } from 'react-i18next'

interface PropertyFiltersProps {
  type: 'sale' | 'rent'
  properties: Property[]
}

// Removed static filters in favor of dynamic translation-based filters

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

const getSaleFilters = (t: (key: string) => string) => [
  {
    id: 'property_type',
    name: t('filters.propertyType'),
    options: [
      { value: 'apartment', label: t('propertyTypes.apartment') },
      { value: 'house', label: t('propertyTypes.house') },
      { value: 'commercial', label: t('propertyTypes.commercial') },
      { value: 'land', label: t('propertyTypes.land') },
    ],
  },
  {
    id: 'price',
    name: t('filters.price'),
    options: [
      { value: '0-100000', label: t('priceRanges.sale.upTo100k') },
      { value: '100000-300000', label: t('priceRanges.sale.100kTo300k') },
      { value: '300000-500000', label: t('priceRanges.sale.300kTo500k') },
      { value: '500000-1000000', label: t('priceRanges.sale.500kTo1m') },
      { value: '1000000+', label: t('priceRanges.sale.over1m') },
    ],
  },
  {
    id: 'rooms',
    name: t('filters.rooms'),
    options: [
      { value: '1', label: t('rooms.one') },
      { value: '2', label: t('rooms.two') },
      { value: '3', label: t('rooms.three') },
      { value: '4+', label: t('rooms.fourPlus') },
    ],
  },
  {
    id: 'area',
    name: t('filters.area'),
    options: [
      { value: '0-50', label: t('areaRanges.sale.upTo50') },
      { value: '50-100', label: t('areaRanges.sale.50To100') },
      { value: '100-200', label: t('areaRanges.sale.100To200') },
      { value: '200+', label: t('areaRanges.sale.over200') },
    ],
  },
  {
    id: 'features',
    name: t('filters.features'),
    options: [
      { value: 'parking', label: t('features.parking') },
      { value: 'balcony', label: t('features.balcony') },
      { value: 'elevator', label: t('features.elevator') },
      { value: 'furnished', label: t('features.furnished') },
    ],
  },
];

const getRentFilters = (t: (key: string) => string) => [
  {
    id: 'property_type',
    name: t('filters.propertyType'),
    options: [
      { value: 'apartment', label: t('propertyTypes.apartment') },
      { value: 'house', label: t('propertyTypes.house') },
      { value: 'commercial', label: t('propertyTypes.commercial') },
    ],
  },
  {
    id: 'price',
    name: t('filters.pricePerMonth'),
    options: [
      { value: '0-500', label: t('priceRanges.rent.upTo500') },
      { value: '500-1000', label: t('priceRanges.rent.500To1000') },
      { value: '1000-2000', label: t('priceRanges.rent.1000To2000') },
      { value: '2000-3000', label: t('priceRanges.rent.2000To3000') },
      { value: '3000+', label: t('priceRanges.rent.over3000') },
    ],
  },
  {
    id: 'rooms',
    name: t('filters.rooms'),
    options: [
      { value: '1', label: t('rooms.one') },
      { value: '2', label: t('rooms.two') },
      { value: '3', label: t('rooms.three') },
      { value: '4+', label: t('rooms.fourPlus') },
    ],
  },
  {
    id: 'area',
    name: t('filters.area'),
    options: [
      { value: '0-40', label: t('areaRanges.rent.upTo40') },
      { value: '40-60', label: t('areaRanges.rent.40To60') },
      { value: '60-100', label: t('areaRanges.rent.60To100') },
      { value: '100+', label: t('areaRanges.rent.over100') },
    ],
  },
  {
    id: 'features',
    name: t('filters.features'),
    options: [
      { value: 'parking', label: t('features.parking') },
      { value: 'balcony', label: t('features.balcony') },
      { value: 'elevator', label: t('features.elevator') },
      { value: 'furnished', label: t('features.furnished') },
    ],
  },
];

// Removed static filters in favor of dynamic translation-based filters

export default function PropertyFilters({ type, properties }: PropertyFiltersProps) {
  const { setFilteredProperties } = useProperties()
  const [localFilters, setLocalFilters] = useState<Record<string, string[]>>({})
  const { t } = useTranslation()

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

  const currentFilters = type === 'sale' ? getSaleFilters(t) : getRentFilters(t)

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
          {t('common.applyFilters')}
        </button>
      </div>
    </div>
  )
}
