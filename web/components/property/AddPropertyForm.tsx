'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, X, Check, MapPin, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PropertyCoordinateSelector } from './PropertyCoordinateSelector';
import type { Database, TablesInsert } from '@shared/lib/database.types';
import {
  fetchContactProfile,
  hasCompleteContactProfile,
  getContactProfileValidationError,
  saveContactProfile,
  type ContactProfileClient,
  type ContactProfile,
} from '@shared/utils/contactProfile';
import { getCityMapCoordinates, serializeMapCoordinates, type MapCoordinates } from '@shared/utils/mapCoordinates';
import { normalizePropertyRooms, parseFiniteNumberInput, propertyTypeSupportsRooms } from '@shared/utils/propertyRules';

type City = Database['public']['Tables']['cities']['Row'];
type District = Database['public']['Tables']['districts']['Row'];

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const EMPTY_CONTACT_PROFILE: ContactProfile = {
  name: '',
  phone: '',
  email: '',
  avatar_url: null,
};

export function AddPropertyForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const contactSupabase = supabase as unknown as ContactProfileClient;

  const [dealType, setDealType] = useState<'sale' | 'rent'>('sale');
  const [propertyType, setPropertyType] = useState('apartment');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [rooms, setRooms] = useState('');
  const [cityId, setCityId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [coordinates, setCoordinates] = useState<MapCoordinates | null>(null);
  const [location, setLocation] = useState('');
  const [isNewBuilding, setIsNewBuilding] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(true);
  const [showSavedContactSummary, setShowSavedContactSummary] = useState(false);
  const [contactProfile, setContactProfile] = useState<ContactProfile>(EMPTY_CONTACT_PROFILE);
  const previewsRef = useRef<string[]>([]);
  const formStateRef = useRef('');
  const supportsRooms = propertyTypeSupportsRooms(propertyType);
  const districtRequired = districts.length > 0;
  const hasSavedContactInfo = hasCompleteContactProfile(contactProfile);
  const showContactFields = !showSavedContactSummary;
  const selectedCity = cities.find((city) => String(city.id) === cityId) ?? null;

  useEffect(() => {
    previewsRef.current = files.map((f) => f.preview);
  }, [files]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!supportsRooms && rooms) {
      setRooms('');
    }
  }, [supportsRooms, rooms]);

  useEffect(() => {
    const nextFormState = JSON.stringify({
      dealType,
      propertyType,
      title,
      description,
      price,
      area,
      rooms,
      cityId,
      districtId,
      coordinates,
      location,
      showSavedContactSummary,
      contactName: contactProfile.name,
      contactPhone: contactProfile.phone,
      selectedFeaturesLength: selectedFeatures.length,
      filesLength: files.length,
    });

    if (formStateRef.current && formStateRef.current !== nextFormState && error) {
      setError(null);
    }

    formStateRef.current = nextFormState;
  }, [
    error,
    dealType,
    propertyType,
    title,
    description,
    price,
    area,
    rooms,
    cityId,
    districtId,
    coordinates,
    location,
    showSavedContactSummary,
    contactProfile.name,
    contactProfile.phone,
    selectedFeatures.length,
    files.length,
  ]);

  useEffect(() => {
    const loadCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (data) {
        setCities(data);
      }
    };

    loadCities();
  }, [supabase]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setContactProfile(EMPTY_CONTACT_PROFILE);
      setContactLoading(false);
      setShowSavedContactSummary(false);
      return;
    }

    let cancelled = false;

    const loadContactProfile = async () => {
      try {
        setContactLoading(true);
        const data = await fetchContactProfile(contactSupabase, user.id, user.email || '');
        if (!cancelled) {
          setContactProfile(data);
          setShowSavedContactSummary(hasCompleteContactProfile(data));
        }
      } catch {
        if (!cancelled) {
          setContactProfile({
            ...EMPTY_CONTACT_PROFILE,
            email: user.email || '',
          });
          setShowSavedContactSummary(false);
        }
      } finally {
        if (!cancelled) {
          setContactLoading(false);
        }
      }
    };

    void loadContactProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, contactSupabase, user]);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      setDistrictId('');
      return;
    }

    const loadDistricts = async () => {
      setDistrictsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('districts')
        .select('id, name, city_id, is_active, sort_order, latitude, longitude')
        .eq('city_id', Number(cityId))
        .eq('is_active', true)
        .order('sort_order')
        .order('name');

      if (!fetchError) {
        const districtList = (data || []) as District[];
        setDistricts(districtList);
        if (districtList.length > 0) {
          const hasSelected = districtList.some((d) => d.id === districtId);
          setDistrictId(hasSelected ? districtId : districtList[0].id);
        } else {
          setDistrictId('');
        }
      } else {
        setDistricts([]);
        setDistrictId('');
      }
      setDistrictsLoading(false);
    };

    loadDistricts();
  }, [cityId, supabase, districtId]);

  const propertyTypes = [
    { value: 'apartment', label: t('property.apartment') },
    { value: 'house', label: t('property.house') },
    { value: 'commercial', label: t('property.commercial') },
    { value: 'land', label: t('property.land') },
  ];

  const featureOptions = [
    'parking',
    'balcony',
    'elevator',
    'furniture',
    'airConditioner',
    'internet',
    'garden',
  ];

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    setError(null);

    const currentCount = files.length;
    const availableSlots = MAX_IMAGES - currentCount;
    if (availableSlots <= 0) {
      setError(`${t('property.addProperty.youCanAddUpTo')} ${MAX_IMAGES} ${t('property.addProperty.photosCount')}`);
      return;
    }

    const incoming = Array.from(list).slice(0, availableSlots);
    const prepared: { file: File; preview: string }[] = [];

    for (const file of incoming) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(t('property.errors.imageUploadFailed'));
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(t('property.errors.imageUploadFailed'));
        continue;
      }

      prepared.push({ file, preview: URL.createObjectURL(file) });
    }

    if (prepared.length === 0) return;
    setFiles((prev) => [...prev, ...prepared]);
  };

  const handleCityChange = (nextCityId: string) => {
    setCityId(nextCityId);

    if (!nextCityId) {
      setCoordinates(null);
      return;
    }

    const nextCity = cities.find((city) => String(city.id) === nextCityId) ?? null;
    setCoordinates(getCityMapCoordinates(nextCity?.coordinates));
  };

  const removeFile = (preview: string) => {
    URL.revokeObjectURL(preview);
    setFiles((prev) => prev.filter((item) => item.preview !== preview));
  };

  const moveFileUp = (preview: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex((item) => item.preview === preview);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveFileDown = (preview: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex((item) => item.preview === preview);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const moveFileToFirst = (preview: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex((item) => item.preview === preview);
      if (idx <= 0) return prev;
      const item = prev[idx];
      return [item, ...prev.filter((f) => f.preview !== preview)];
    });
  };

  const toggleFeature = (value: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  };

  const uploadImages = async () => {
    const uploaded: string[] = [];

    for (const item of files) {
      const ext = (item.file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
      const filePath = `property-images/${user?.id || 'public'}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(filePath, item.file, {
          contentType: item.file.type || `image/${safeExt}`,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage.from('properties').getPublicUrl(filePath);
      uploaded.push(data.publicUrl);
    }

    return uploaded;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (authLoading) return;

    if (!user) {
      router.push('/prijava');
      return;
    }

    if (districtsLoading) {
      setError(t('common.loading'));
      return;
    }

    if (contactLoading) {
      setError(t('common.loading'));
      return;
    }

    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim() ||
      !cityId ||
      !price ||
      !area ||
      (supportsRooms && !rooms) ||
      (districtRequired && !districtId)
    ) {
      setError(t('property.addProperty.validation.fillAllFields'));
      return;
    }

    const contactValidationError = getContactProfileValidationError(contactProfile);
    if (contactValidationError === 'name') {
      setError(t('profile.errors.nameRequired'));
      return;
    }

    if (contactValidationError === 'phone') {
      setError(t('profile.errors.phoneRequired'));
      return;
    }

    if (files.length === 0) {
      setError(t('property.addProperty.validation.addAtLeastOnePhoto'));
      return;
    }

    const numericPrice = parseFiniteNumberInput(price);
    const numericArea = parseFiniteNumberInput(area);
    const numericRooms = normalizePropertyRooms(propertyType, rooms);

    if (numericPrice === null || numericArea === null || (supportsRooms && numericRooms === null)) {
      setError(t('filters.validation.invalidNumber'));
      return;
    }

    setSubmitting(true);

    try {
      await saveContactProfile(contactSupabase, {
        userId: user.id,
        email: user.email || contactProfile.email,
        profile: contactProfile,
      });

      const imageUrls = await uploadImages();
      const propertyCoordinates = coordinates ?? getCityMapCoordinates(selectedCity?.coordinates);
      const payload: TablesInsert<'properties'> = {
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        area: numericArea,
        rooms: numericRooms ?? 0,
        city_id: Number(cityId),
        district_id: districtId || null,
        location: location.trim(),
        type: dealType,
        property_type: propertyType,
        is_new_building: isNewBuilding,
        features: selectedFeatures.length ? selectedFeatures : null,
        images: imageUrls,
        coordinates: serializeMapCoordinates(propertyCoordinates),
        status: 'active',
        user_id: user.id,
      };

      const { data, error: insertError } = await supabase
        .from('properties')
        // Render ломает типы, поэтому приводим к any, чтобы не падал билд
        .insert(payload as any)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(t('property.addProperty.addSuccess'));
      setTitle('');
      setDescription('');
      setPrice('');
      setArea('');
      setRooms('');
      setLocation('');
      setSelectedFeatures([]);
      setFiles([]);

      const createdId = (data as { id?: string } | null)?.id;
      if (createdId) {
        router.push(`/oglas/?id=${createdId}`);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('property.addProperty.addError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">{t('auth.loginRequired')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-textSecondary">{t('auth.loginRequiredDesc')}</p>
            <Button onClick={() => router.push('/prijava')}>
              {t('common.login')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">{t('property.addProperty.title')}</h1>
          <p className="text-textSecondary">{t('property.addProperty.selectType')}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('addProperty.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactLoading ? (
                <div className="flex items-center gap-2 text-sm text-textSecondary">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {t('common.loading')}
                </div>
              ) : showContactFields ? (
                <>
                  <p className="text-sm text-textSecondary">
                    {hasSavedContactInfo ? t('profile.contactInfoEditingHint') : t('profile.contactInfoRequiredHint')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label={t('profile.name')}
                      placeholder={t('addProperty.form.namePlaceholder')}
                      value={contactProfile.name}
                      onChange={(e) => setContactProfile((current) => ({ ...current, name: e.target.value }))}
                      autoComplete="name"
                      required
                    />
                    <Input
                      label={t('profile.phone')}
                      placeholder={t('addProperty.form.phonePlaceholder')}
                      value={contactProfile.phone}
                      onChange={(e) => setContactProfile((current) => ({ ...current, phone: e.target.value }))}
                      autoComplete="tel"
                      required
                    />
                    <Input
                      label={t('profile.email')}
                      value={contactProfile.email || user.email || ''}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-textSecondary">{t('profile.contactInfoDescription')}</span>
                    <Link href="/profil/kontakti" className="text-primary hover:underline">
                      {t('profile.openContactInfo')}
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-textSecondary">
                    {t('profile.contactInfoAutoFilledHint')}
                  </p>
                  <div className="rounded-xl border border-border bg-surface px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="mb-1 text-xs uppercase tracking-wide text-textSecondary">{t('profile.name')}</div>
                        <div className="text-sm font-medium text-text">{contactProfile.name}</div>
                      </div>
                      <div>
                        <div className="mb-1 text-xs uppercase tracking-wide text-textSecondary">{t('profile.phone')}</div>
                        <div className="text-sm font-medium text-text">{contactProfile.phone}</div>
                      </div>
                      <div>
                        <div className="mb-1 text-xs uppercase tracking-wide text-textSecondary">{t('profile.email')}</div>
                        <div className="text-sm font-medium text-text">{contactProfile.email || user.email || ''}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-textSecondary">{t('profile.contactInfoPublishingHint')}</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setShowSavedContactSummary(false)}
                      >
                        {t('common.edit')}
                      </button>
                      <Link href="/profil/kontakti" className="text-primary hover:underline">
                        {t('profile.openContactInfo')}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('addProperty.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">{t('property.dealType')}</label>
                  <div className="flex flex-wrap gap-2">
                    {(['sale', 'rent'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={dealType === type ? 'primary' : 'outline'}
                        onClick={() => setDealType(type)}
                      >
                        {type === 'sale' ? t('property.sale') : t('property.rent')}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">{t('property.propertyType')}</label>
                  <div className="flex flex-wrap gap-2">
                    {propertyTypes.map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={propertyType === type.value ? 'primary' : 'outline'}
                        onClick={() => setPropertyType(type.value)}
                        className="whitespace-nowrap"
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('property.addProperty.propertyTitle')}
                  placeholder={t('property.addProperty.propertyTitlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  label={t('property.price')}
                  placeholder={t('property.pricePlaceholder')}
                  value={price}
                  min={0}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="number"
                  label={t('property.area')}
                  placeholder={t('property.areaPlaceholder')}
                  value={area}
                  min={0}
                  onChange={(e) => setArea(e.target.value)}
                  required
                />
                {supportsRooms ? (
                  <Input
                    type="number"
                    label={t('property.rooms')}
                    placeholder={t('property.roomsPlaceholder')}
                    value={rooms}
                    min={0}
                    onChange={(e) => setRooms(e.target.value)}
                    required
                  />
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3 pt-6">
                  <input
                    id="new-building"
                    type="checkbox"
                    checked={isNewBuilding}
                    onChange={(e) => setIsNewBuilding(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="new-building" className="text-sm font-medium text-text cursor-pointer">
                    {t('common.newBuildings')}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('property.location')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    {t('property.city')}
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    value={cityId}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    <option value="">{t('common.selectCity')}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {t(`cities.${city.name}`, { defaultValue: city.name })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    {t('property.district')}
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    disabled={!cityId || districtsLoading || districts.length === 0}
                  >
                    <option value="">{districtsLoading ? t('common.loading') : t('common.selectDistrict')}</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {t(`districts.${district.name}`, { defaultValue: district.name })}
                      </option>
                    ))}
                  </select>
                  {cityId && !districtsLoading && districts.length === 0 ? (
                    <p className="mt-2 text-sm text-textSecondary">
                      {t('addProperty.form.noDistricts')}
                    </p>
                  ) : null}
                </div>
              </div>

              <Input
                label={t('property.address')}
                placeholder={t('property.addressPlaceholder')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />

              <PropertyCoordinateSelector
                selectedCity={selectedCity}
                value={coordinates}
                onChange={setCoordinates}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('property.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  {t('property.description')}
                </label>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[140px]"
                  placeholder={t('property.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  {t('property.features')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {featureOptions.map((feature) => (
                    <button
                      type="button"
                      key={feature}
                      onClick={() => toggleFeature(feature)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                        selectedFeatures.includes(feature)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-text hover:border-primary/60'
                      }`}
                    >
                      {selectedFeatures.includes(feature) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4 opacity-50" />
                      )}
                      {t(`features.${feature}`, { defaultValue: feature })}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('property.addProperty.photoUpload')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-textSecondary">
                  {t('property.addProperty.youCanAddUpTo')} {MAX_IMAGES} {t('property.addProperty.photosCount')}.{' '}
                  {t('property.addProperty.validation.addAtLeastOnePhoto')}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-text hover:border-primary">
                  <Upload className="h-4 w-4" />
                  <span>{t('property.addProperty.addPhoto')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
              </div>

              {files.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((item, index) => (
                    <div key={item.preview} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview}
                        alt="preview"
                        className="h-32 w-full rounded-lg object-cover"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
                          {t('property.mainPhoto')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(item.preview)}
                        className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white"
                        aria-label="remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 rounded-b-lg bg-black/50 px-2 py-1">
                        <button
                          type="button"
                          onClick={() => moveFileUp(item.preview)}
                          disabled={index === 0}
                          className="rounded p-1 text-white disabled:opacity-30"
                          title={t('property.moveUp')}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFileDown(item.preview)}
                          disabled={index === files.length - 1}
                          className="rounded p-1 text-white disabled:opacity-30"
                          title={t('property.moveDown')}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => moveFileToFirst(item.preview)}
                            className="rounded p-1 text-white"
                            title={t('property.makeMainPhoto')}
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-textSecondary">
                  {t('property.addProperty.validation.addAtLeastOnePhoto')}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || districtsLoading}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('property.addProperty.publish')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
