import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabaseClient'
import SEO from '../components/SEO'
import Footer from '../components/layout/Footer'
import PropertyCard from '../components/property/PropertyCard'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PhoneIcon,
  ShareIcon,
} from '@heroicons/react/24/outline'
import type { Property } from '../contexts/PropertyContext'

type Agency = {
  id: string
  name: string | null
  logo_url: string | null
  phone: string | null
  email?: string | null
  website?: string | null
  description?: string | null
  location?: string | null
  address?: string | null
  city_id?: number | null
  city?: { id: number; name: string }
}

export default function AgencyDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [agency, setAgency] = useState<Agency | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<string | null>(null)

  const shareUrl = useMemo(() => {
    if (!agency?.id) return ''
    return `https://domgo.rs/agency.html?id=${agency.id}`
  }, [agency?.id])

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        setLoading(true)
        setError(null)

        const { data: agencyData, error: agencyError } = await supabase
          .from('agency_profiles')
          .select('id, name, logo_url, phone, email, website, description, location, address, city_id, city:cities(id, name)')
          .eq('id', id)
          .single()

        if (agencyError) throw agencyError
        setAgency(agencyData as Agency)

        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('*, city:cities(name)')
          .eq('agency_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (propertiesError) throw propertiesError
        setProperties((propertiesData as Property[]) ?? [])
      } catch (e) {
        console.error('Ошибка загрузки агентства', e)
        setError(t('agency.loadError', 'Не удалось загрузить агентство'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, t])

  const handleShare = async () => {
    if (!agency || !shareUrl) return
    setShareStatus(null)

    try {
      if (navigator.share) {
        await navigator.share({
          title: agency.name || t('agency.unnamed', 'Агентство'),
          url: shareUrl,
        })
        setShareStatus(t('agency.shareSuccess', 'Ссылка отправлена'))
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setShareStatus(t('agency.shareCopied', 'Ссылка скопирована'))
    } catch (e) {
      console.error('Share error', e)
      setShareStatus(t('agency.shareFailed', 'Не удалось поделиться'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SEO title={agency?.name || t('common.agencies', 'Агентства')} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-12 flex-1 w-full">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('common.back', 'Назад')}</span>
        </button>

        {loading ? (
          <div className="flex justify-center py-12 text-gray-500">{t('common.loading')}</div>
        ) : error ? (
          <div className="text-center text-red-600 py-12">{error}</div>
        ) : !agency ? (
          <div className="text-center text-gray-500 py-12">{t('agency.notFound', 'Агентство не найдено')}</div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary-100 text-secondary-600 flex items-center justify-center overflow-hidden">
                    {agency.logo_url ? (
                      <img src={agency.logo_url} alt={agency.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <BuildingOffice2Icon className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-gray-900">{agency.name || t('agency.unnamed', 'Агентство')}</div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{agency.city?.name || agency.location || t('common.notSpecified', 'Не указано')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {agency.phone && (
                    <a
                      href={`tel:${agency.phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary-50 text-secondary-700 hover:bg-secondary-100 transition"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      <span>{t('agency.call', 'Позвонить')}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-700 transition"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span>{t('common.share', 'Поделиться')}</span>
                  </button>
                </div>
              </div>

              {(agency.description || agency.address) && (
                <div className="mt-4 text-gray-700 leading-relaxed whitespace-pre-line">
                  {agency.description}
                  {agency.address && !agency.description && <span>{agency.address}</span>}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-600">
                {agency.email && (
                  <a href={`mailto:${agency.email}`} className="inline-flex items-center gap-2 hover:text-gray-900">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span>{agency.email}</span>
                  </a>
                )}
                {agency.website && (
                  <a href={agency.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-gray-900">
                    <GlobeAltIcon className="w-4 h-4" />
                    <span>{agency.website}</span>
                  </a>
                )}
              </div>

              {shareStatus && <div className="mt-3 text-sm text-gray-500">{shareStatus}</div>}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{t('agency.listings', 'Объявления агентства')}</h2>
              <span className="text-sm text-gray-500">
                {t('agency.listingCount', 'Объявлений: {{count}}', { count: properties.length })}
              </span>
            </div>

            {properties.length === 0 ? (
              <div className="text-center text-gray-500 bg-white rounded-2xl border border-gray-200 py-10">
                {t('agency.noListings', 'У агентства пока нет активных объявлений')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
