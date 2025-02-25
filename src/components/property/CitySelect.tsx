import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface CitySelectProps {
  onCitySelect: (coordinates: { lng: number; lat: number }) => void
}

interface City {
  id: number
  name: string
  coordinates: {
    lat: number
    lng: number
  }
}

interface CitySelectProps {
  onCitySelect: (coordinates: { lat: number; lng: number }) => void
}

export default function CitySelect({ onCitySelect }: CitySelectProps) {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('cities')
          .select('id, name, coordinates')
          .order('name')

        if (error) throw error
        if (data) setCities(data)
      } catch (error) {
        console.error('Error fetching cities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [])

  const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = parseInt(event.target.value)
    const selectedCity = cities.find(city => city.id === cityId)
    
    if (selectedCity) {
      onCitySelect({
        lng: selectedCity.coordinates.lng,
        lat: selectedCity.coordinates.lat
      })
    }
  }

  return (
    <div className="relative">
      <select
        onChange={handleCityChange}
        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        defaultValue=""
      >
        <option value="" disabled>
          Выберите город
        </option>
        {cities.map(city => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </div>
  )
}