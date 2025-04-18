import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { Disclosure } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { ChevronUpIcon, ChevronDownIcon as OutlineChevronDownIcon } from '@heroicons/react/24/outline'
import { useProperties, Property } from '../../contexts/PropertyContext'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

interface PropertyFiltersProps {
  type: 'sale' | 'rent'
  properties: Property[]
  // Можно передать начальные значения фильтров
  initialFilters?: Record<string, string[]>
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

function PropertyFiltersComponent({ type, properties, initialFilters }: PropertyFiltersProps) {
  const { setFilteredProperties } = useProperties()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
  
  // Состояние для отслеживания развернутости фильтров
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Добавляем состояние для дебаунсинга
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [localFilters, setLocalFilters] = useState<Record<string, string[]>>(initialFilters || {})

  // Инициализация фильтров из URL-параметров при загрузке
  useEffect(() => {
    const propertyType = searchParams.get('propertyType')
    if (propertyType) {
      setLocalFilters(prev => ({
        ...prev,
        property_type: [propertyType]
      }))
    }
  }, []) // Выполняется только при монтировании компонента

  // Важно: базовая фильтрация по типу сделки (sale/rent) срабатывает автоматически
  // а остальные фильтры применяются только по нажатию кнопки
  useEffect(() => {
    // Важно выполнить базовую фильтрацию при загрузке компонента,
    // чтобы не было смешивания объявлений из разных разделов
    const initialFiltered = properties.filter(property => property.type === type);
    setFilteredProperties(initialFiltered);
  }, [properties, type, setFilteredProperties])

  const applyFilters = useCallback(() => {
    console.log('Applying filters:', localFilters)
    console.log('Total properties before filtering:', properties.length)

    // Сначала отфильтруем только объявления нужного типа (sale/rent)
    // Это ключевой момент - мы сначала берем только объявления нужного типа
    const typeFilteredProperties = properties.filter(property => property.type === type);
    console.log(`Properties of type ${type}:`, typeFilteredProperties.length);

    // Если нет фильтров, просто показываем объявления по типу
    if (Object.keys(localFilters).length === 0) {
      setFilteredProperties(typeFilteredProperties);
      return;
    }

    const filtered = typeFilteredProperties.filter(property => {
      // Проверяем другие фильтры (НО УЖЕ только для объявлений нужного типа)
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
            let matchesRooms = values.includes(property.rooms?.toString())
            
            // Если выбран фильтр "4+" и у объекта 4 или больше комнат
            if (!matchesRooms && values.includes('4+') && property.rooms >= 4) {
              matchesRooms = true;
            }
            
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
  }, [localFilters, properties, type, setFilteredProperties])

  // Синхронизация URL-параметров с текущими фильтрами
  const syncUrlWithFilters = (filters: Record<string, string[]>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    
    // Если есть фильтр по типу недвижимости, обновляем URL
    if (filters.property_type && filters.property_type.length > 0) {
      newParams.set('propertyType', filters.property_type[0])
    } else {
      newParams.delete('propertyType')
    }
    
    // Обновляем URL без перезагрузки страницы
    setSearchParams(newParams, { replace: true })
  }
  
  // Проверяем, есть ли активные фильтры
  const hasActiveFilters = () => {
    return Object.keys(localFilters).length > 0 && 
      Object.values(localFilters).some(values => values.length > 0)
  }
  
  // Сброс всех фильтров
  const resetFilters = () => {
    console.log('Сбрасываем все фильтры')
    
    // Сбрасываем все локальные фильтры
    setLocalFilters({})
    
    // Удаляем параметр propertyType из URL
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.delete('propertyType')
    setSearchParams(newParams, { replace: true })
    
    // Очищаем дебаунс-таймер, если он есть
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }
    
    // Применяем фильтры - показываем все объявления текущего типа (sale/rent)
    console.log('Применяем базовую фильтрацию по типу:', type)
    const typeFilteredProperties = properties.filter(p => p.type === type);
    console.log('Количество объявлений после сброса фильтров:', typeFilteredProperties.length)
    setFilteredProperties(typeFilteredProperties)
  }

  // Обработчик изменения фильтров без автоматического применения
  const handleFilterChange = useCallback((sectionId: string, value: string, checked: boolean) => {
    console.log(`Filter change: ${sectionId}, value: ${value}, checked: ${checked}`)
    setLocalFilters(prev => {
      const current = prev[sectionId] || []
      const updated = checked
        ? { ...prev, [sectionId]: [...current, value] }
        : { ...prev, [sectionId]: current.filter(v => v !== value) }
      
      // Не применяем фильтры автоматически, только обновляем состояние
      // Фильтры будут применены только по кнопке "Применить фильтры"
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      console.log('Updated filters:', updated)
      return updated
    })
  }, [debounceTimer])

  // Мемоизируем фильтры для предотвращения лишних вычислений
  const currentFilters = useMemo(() => {
    return type === 'sale' ? getSaleFilters(t) : getRentFilters(t)
  }, [type, t])
  
  // Подсчитываем количество активных фильтров для отображения в заголовке
  const activeFiltersCount = useMemo(() => {
    return Object.values(localFilters).reduce((count, values) => count + values.length, 0);
  }, [localFilters])

  return (
    <div className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 p-4 sm:p-6">
      {/* Заголовок фильтров с возможностью скрыть/показать */}
      <div 
        className="flex items-center justify-between cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mr-2">
            {t('common.filters')}
          </h2>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" aria-hidden="true" />
        ) : (
          <OutlineChevronDownIcon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" aria-hidden="true" />
        )}
      </div>

      {/* Скрываемые фильтры */}
      {isExpanded && (
        <div className="mt-3 space-y-4 pt-3 border-t border-gray-200">
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
      <div className="pt-4 space-y-2">
        <button
          onClick={() => {
            if (debounceTimer) {
              clearTimeout(debounceTimer);
              setDebounceTimer(null);
            }
            // Применяем фильтры и синхронизируем URL со всеми текущими фильтрами
            console.log('Нажата кнопка Применить фильтры')
            syncUrlWithFilters(localFilters)
            applyFilters()
          }}
          className="w-full bg-[#1E3A8A] text-white py-3 px-4 rounded-xl hover:bg-[#1E3A8A]/90 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
        >
          {t('common.applyFilters')}
        </button>
        
        {/* Кнопка Сбросить фильтры - активна, только если есть активные фильтры */}
        <button
          onClick={resetFilters}
          disabled={!hasActiveFilters()}
          className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-300 
            ${hasActiveFilters() 
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
        >
          {t('common.resetFilters')}
        </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Применяем мемоизацию компонента для предотвращения лишних перерисовок
export default memo(PropertyFiltersComponent, (prevProps, nextProps) => {
  // Если тип недвижимости не изменился, и количество объектов то же самое, не перерисовываем
  return prevProps.type === nextProps.type && prevProps.properties.length === nextProps.properties.length;
});
