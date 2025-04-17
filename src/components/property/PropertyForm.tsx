import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { compressImage } from '../../utils/imageCompression'

interface PropertyFormData {
  title: string
  description: string
  type: 'sale' | 'rent'
  property_type: string
  price: number
  area: number
  rooms: number
  location: string
  images: File[]
  features: string[]
  coordinates: { lat: number; lng: number } | null
  city_id: number | null
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function LocationMarker({ position, setPosition }: {
  position: { lat: number; lng: number } | null
  setPosition: (pos: { lat: number; lng: number }) => void
}) {
  const map = useMapEvents({
    click(e: L.LeafletMouseEvent) {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return position === null ? null : (
    <Marker position={position} icon={defaultIcon} />
  )
}

export default function PropertyForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userData, setUserData] = useState({
    name: '',
    phone: ''
  })
  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    type: 'sale',
    property_type: 'apartment',
    price: 0,
    area: 0,
    rooms: 1,
    location: '',
    images: [],
    features: [],
    coordinates: null,
    city_id: null
  })
  
  // Состояние для отслеживания загруженных файлов и статуса отправки
  const [uploadedFiles, setUploadedFiles] = useState<{path: string, fileName: string}[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  // Добавляем состояние загрузки для блокировки кнопки во время отправки
  const [isLoading, setIsLoading] = useState(false)
  // Состояние для отображения сообщения об успешной отправке
  const [successMessage, setSuccessMessage] = useState('')
  
  // Создаем уникальный идентификатор для этой сессии формы
  // Он будет использоваться для предотвращения дубликатов
  const formSessionId = useRef(`${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  // Флаг, который показывает, была ли эта форма уже отправлена
  const hasBeenSubmitted = useRef(false);

  useEffect(() => {
    // Загрузка данных пользователя при монтировании компонента
    const fetchUserData = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('name, phone')
            .eq('id', user.id)
            .single();
            
          if (data) {
            setUserData({
              name: data.name || '',
              phone: data.phone || ''
            });
          }
          
          if (error) throw error;
        } catch (error) {
          console.error('Ошибка при загрузке данных пользователя:', error);
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Сразу очищаем значение поля input, чтобы можно было повторно выбрать те же файлы
    const input = e.target;
    const files = Array.from(input.files || []);
    
    // Проверяем, не превышено ли максимальное количество фотографий
    if (files.length + formData.images.length > 15) {
      alert('Максимальное количество фотографий - 15');
      // Сбрасываем значение поля file input, чтобы пользователь мог снова его использовать
      if (input) input.value = '';
      return;
    }
    
    // Добавляем файлы в состояние формы
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 15)
    }));
    
    // Загружаем и сжимаем каждый файл сразу после выбора
    try {
      const newUploadedFiles = await Promise.all(
        files.map(async (file) => {
          // Сжимаем изображение
          const compressedFile = await compressImage(file, 0.3);
          
          // Создаем уникальное имя файла
          const fileExt = compressedFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `properties/${fileName}`;
          
          // Загружаем файл
          const { error } = await supabase.storage
            .from('properties')
            .upload(filePath, compressedFile);
          
          if (error) {
            console.error('Ошибка при загрузке файла:', error);
            throw error;
          }
          
          console.log(`Файл загружен: ${filePath}`);
          return { path: filePath, fileName: file.name };
        })
      );
      
      // Добавляем новые загруженные файлы к существующим
      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      
    } catch (error) {
      console.error('Ошибка при обработке и загрузке файлов:', error);
      alert('Произошла ошибка при загрузке фотографий. Пожалуйста, попробуйте еще раз.');
    } finally {
      // Сбрасываем значение поля file input в любом случае, чтобы пользователь мог снова его использовать
      if (input) input.value = '';
    }
  }, [formData.images])

  const handleLocationSelect = async (position: { lat: number; lng: number }) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${position.lat}&lon=${position.lng}&format=json`
      )
      const data = await response.json()
      
      // Извлекаем только название улицы из полного адреса
      const street = data.address?.road || data.address?.street || ''
      const houseNumber = data.address?.house_number || ''
      const location = street + (houseNumber ? `, ${houseNumber}` : '')

      setFormData(prev => ({
        ...prev,
        location: location,
        coordinates: position
      }))
    } catch (error) {
      console.error('Error fetching address:', error)
    }
  }

  // Функция для очистки загруженных фотографий, если объявление не было создано
  const cleanupUploadedFiles = useCallback(async () => {
    if (uploadedFiles.length === 0 || isSubmitted) {
      return; // Ничего не делаем, если нет файлов или форма была успешно отправлена
    }
    
    try {
      console.log('Очистка временных файлов:', uploadedFiles);
      // Удаляем все файлы из хранилища
      for (const file of uploadedFiles) {
        const { error } = await supabase.storage
          .from('properties')
          .remove([file.path]);
          
        if (error) {
          console.error(`Ошибка при удалении файла ${file.path}:`, error);
        } else {
          console.log(`Успешно удалён файл: ${file.path}`);
        }
      }
      
      setUploadedFiles([]);
    } catch (error) {
      console.error('Ошибка при очистке временных файлов:', error);
    }
  }, [uploadedFiles, isSubmitted]);
  
  // Обработчик для события закрытия страницы
  useEffect(() => {
    // Добавляем обработчик beforeunload для очистки при закрытии страницы
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Добавляем стандартное сообщение о подтверждении закрытия
      if (uploadedFiles.length > 0 && !isSubmitted) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?';
        
        // Создаем копию файлов для удаления
        const filesToDelete = [...uploadedFiles];
        console.log('Запускаем очистку при закрытии:', filesToDelete);
        
        // Запускаем запрос на удаление через специальный endpoint
        try {
          // Сохраняем пути для удаления в localStorage
          localStorage.setItem('temp_property_files', JSON.stringify(filesToDelete.map(f => f.path)));
        } catch (error) {
          console.error('Ошибка при сохранении файлов для удаления:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Очистка при размонтировании компонента
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Также пытаемся очистить файлы при выходе из компонента
      cleanupUploadedFiles();
    };
  }, [cleanupUploadedFiles, uploadedFiles, isSubmitted]);

  // Функция для очистки формы после успешной отправки
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'sale',
      property_type: 'apartment',
      price: 0,
      area: 0,
      rooms: 1,
      location: '',
      images: [],
      features: [],
      coordinates: null,
      city_id: null
    });
    setUploadedFiles([]);
    setSuccessMessage('Объявление успешно опубликовано!');
    
    // Скрываем сообщение об успехе через 5 секунд
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    // Предотвращаем множественные отправки
    if (isLoading) {
      console.log('Запрос уже выполняется, ожидайте');
      return;
    }
    
    // Проверяем, была ли эта форма уже отправлена успешно
    if (hasBeenSubmitted.current) {
      console.log('Эта форма уже была отправлена');
      alert('Объявление уже было отправлено. Пожалуйста, обновите страницу, чтобы создать новое объявление.');
      return;
    }

    // Проверка обязательных полей пользователя
    if (!userData.name.trim()) {
      alert('Введите ваше имя')
      return
    }

    if (!userData.phone.trim()) {
      alert('Введите номер телефона')
      return
    }
    
    // Устанавливаем состояние загрузки
    setIsLoading(true);

    try {
      // Помечаем форму как отправленную, чтобы не удалять файлы при успешном сохранении
      setIsSubmitted(true);
      
      // Обновляем профиль пользователя
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: userData.name,
          phone: userData.phone
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Ошибка при обновлении профиля:', profileError)
        throw profileError
      }

      // Upload images
      const imageUrls = await Promise.all(
        formData.images.map(async (file) => {
          // Проверяем, был ли этот файл уже загружен ранее
          const existingUpload = uploadedFiles.find(f => f.fileName === file.name);
          if (existingUpload) {
            return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/properties/${existingUpload.path.split('/').pop()}`;
          }
          
          // Если файл новый, сжимаем и загружаем
          const compressedFile = await compressImage(file, 0.3) // Сжимаем до 300 КБ
          
          const fileExt = compressedFile.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `properties/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('properties')
            .upload(filePath, compressedFile)

          if (uploadError) throw uploadError

          return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/properties/${fileName}`
        })
      )

      // Create property listing с уникальным идентификатором сессии формы
      const { error } = await supabase.from('properties').insert({
        ...formData,
        images: imageUrls,
        user_id: user.id,
        status: 'active',
        // Добавляем метаданные, чтобы можно было отследить дубликаты
        metadata: {
          form_session_id: formSessionId.current,
          created_at: new Date().toISOString()
        }
      })

      if (error) throw error

      // Помечаем, что форма была успешно отправлена
      hasBeenSubmitted.current = true;

      // Очищаем форму после успешной отправки
      resetForm();
      
      // Переходим на главную страницу через небольшую задержку, чтобы пользователь увидел сообщение об успехе
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error creating property:', error)
      alert('Ошибка при создании объявления')
      // В случае ошибки сбрасываем статус отправки формы
      setIsSubmitted(false);
    } finally {
      // Снимаем флаг загрузки в любом случае (успех или ошибка)
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Контактная информация</label>
        <div className="mt-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ваше имя</label>
            <input
              type="text"
              required
              value={userData.name}
              onChange={e => setUserData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Иван Иванов"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Ваш телефон</label>
            <input
              type="tel"
              required
              value={userData.phone}
              onChange={e => setUserData(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="+7 (999) 123-45-67"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Фотографии (до 15 шт.)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="mt-1 block w-full"
          disabled={formData.images.length >= 15}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {formData.images.map((file, index) => (
            <div key={index} className="relative w-24 h-24 group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded"
              />
              
              {/* Кнопка удаления фотографии */}
              <button
                type="button"
                onClick={() => {
                  // Удаляем фотографию по индексу
                  setFormData(prev => ({
                    ...prev,
                    images: prev.images.filter((_, i) => i !== index)
                  }));
                }}
                className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md group-hover:opacity-100 opacity-0 transition-opacity"
                aria-label="Удалить"
              >
                ✕
              </button>
              
              {/* Кнопки перемещения фотографии */}
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 flex flex-col gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                {/* Кнопка вверх */}
                <button
                  type="button"
                  onClick={() => {
                    if (index === 0) return; // Не двигаем вверх, если это первый элемент
                    const newImages = [...formData.images];
                    const temp = newImages[index];
                    newImages[index] = newImages[index - 1];
                    newImages[index - 1] = temp;
                    setFormData(prev => ({ ...prev, images: newImages }));
                  }}
                  disabled={index === 0}
                  className={`bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Переместить вверх"
                >
                  ↑
                </button>
                
                {/* Кнопка вниз */}
                <button
                  type="button"
                  onClick={() => {
                    if (index === formData.images.length - 1) return; // Не двигаем вниз, если это последний элемент
                    const newImages = [...formData.images];
                    const temp = newImages[index];
                    newImages[index] = newImages[index + 1];
                    newImages[index + 1] = temp;
                    setFormData(prev => ({ ...prev, images: newImages }));
                  }}
                  disabled={index === formData.images.length - 1}
                  className={`bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md ${index === formData.images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Переместить вниз"
                >
                  ↓
                </button>
              </div>
              
              {/* Номер фотографии */}
              <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white px-1 text-xs rounded-br rounded-tl">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Заголовок</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Описание</label>
          <textarea
            required
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Тип объявления</label>
          <select
            value={formData.type}
            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'sale' | 'rent' }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="sale">Продажа</option>
            <option value="rent">Аренда</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Тип недвижимости</label>
          <select
            value={formData.property_type}
            onChange={e => setFormData(prev => ({ ...prev, property_type: e.target.value }))}            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="apartment">Квартира</option>
            <option value="house">Дом</option>
            <option value="commercial">Коммерческая недвижимость</option>
            {formData.type === 'sale' && <option value="land">Земельный участок</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Цена</label>
          <input
            type="number"
            required
            min="0"
            value={formData.price}
            onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Площадь (м²)</label>
          <input
            type="number"
            required
            min="0"
            value={formData.area}
            onChange={e => setFormData(prev => ({ ...prev, area: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Количество комнат</label>
          <input
            type="number"
            required
            min="1"
            value={formData.rooms}
            onChange={e => setFormData(prev => ({ ...prev, rooms: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Расположение на карте</label>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <MapContainer
              center={[44.787197, 20.457273]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker
                position={formData.coordinates}
                setPosition={handleLocationSelect}
              />
            </MapContainer>
          </div>
          {formData.location && (
            <div className="mt-2 text-sm text-gray-500">
              Выбранный адрес: {formData.location}
            </div>
          )}
        </div>
      </div>

      {/* Отображаем сообщение об успешной отправке, если оно есть */}
        {successMessage && (
          <div className="mt-3 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            {successMessage}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading}
          className={`mt-5 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Отправка...
            </>
          ) : (
            'Опубликовать объявление'
          )}
        </button>
    </form>
  )
}