import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import Footer from '../components/layout/Footer'
import SEO from '../components/SEO'
import { useCity } from '../contexts/CityContext'
import { BuildingOffice2Icon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

type Agency = {
  id: string
  name: string | null
  logo_url: string | null
  phone: string | null
  location: string | null
  city?: { id: number; name: string }
  city_id?: number | null
}

export default function AgenciesPage() {
  const { t } = useTranslation()
  const { selectedCity } = useCity()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
          .from('agency_profiles')
          .select('id, name, logo_url, phone, location, city_id, city:cities(id, name)')
          .order('name', { ascending: true })
        if (error) throw error
        setAgencies((data as Agency[]) ?? [])
      } catch (e) {
        console.error('Ошибка загрузки агентств', e)
        setError(t('agency.loadError', 'Не удалось загрузить агентства'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [t])

  const filtered = useMemo(() => {
    if (!selectedCity) return agencies
    return agencies.filter(a => a.city_id === selectedCity.id || a.city?.id === selectedCity.id)
  }, [agencies, selectedCity])

  return (
    <div className="min-h-screen bg-gray-100">
      <SEO title={t('common.agencies', 'Агентства')} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('common.agencies', 'Агентства')}</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-gray-500">{t('common.loading')}</div>
        ) : error ? (
          <div className="text-center text-red-600 py-12">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-12">{t('agency.emptyList', 'Агентства пока не добавлены')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((agency) => (
              <Link
                to={`/agencies/${agency.id}`}
                key={agency.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex gap-4 items-center transition hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary-100 text-secondary-600 flex items-center justify-center">
                  {agency.logo_url ? (
                    <img src={agency.logo_url} alt={agency.name || ''} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <BuildingOffice2Icon className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold text-gray-900 truncate">{agency.name || t('agency.unnamed', 'Агентство')}</div>
                  <div className="flex items-center text-gray-500 text-sm gap-1 mt-1 truncate">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{agency.city?.name || agency.location || t('common.notSpecified', 'Не указано')}</span>
                  </div>
                  {agency.phone && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        window.location.href = `tel:${agency.phone}`
                      }}
                      className="flex items-center text-secondary-600 text-sm gap-1 mt-2 hover:text-secondary-700"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      <span>{agency.phone}</span>
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
