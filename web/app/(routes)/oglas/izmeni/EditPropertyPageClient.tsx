'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, X, Check, MapPin, ArrowLeft, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { PropertyCoordinateSelector } from '@/components/property/PropertyCoordinateSelector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import type { Database } from '@shared/lib/database.types';
import { getCityMapCoordinates, parseMapCoordinates, serializeMapCoordinates, type MapCoordinates } from '@shared/utils/mapCoordinates';
import { normalizePropertyRooms, parseFiniteNumberInput, propertyTypeSupportsRooms } from '@shared/utils/propertyRules';

type City = Database['public']['Tables']['cities']['Row'];
type District = Database['public']['Tables']['districts']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

type ImageItem =
    | { id: string; type: 'existing'; url: string }
    | { id: string; type: 'new'; file: File; preview: string };

function EditPropertyContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const propertyId = searchParams.get('id');
    const { user, loading: authLoading } = useAuth();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
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
    const [images, setImages] = useState<ImageItem[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [districtsLoading, setDistrictsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const formStateRef = useRef('');
    const coordinatesInitializedRef = useRef(false);
    const imagesRef = useRef<ImageItem[]>([]);
    imagesRef.current = images;
    const supportsRooms = propertyTypeSupportsRooms(propertyType);
    const districtRequired = districts.length > 0;
    const selectedCity = cities.find((city) => String(city.id) === cityId) ?? null;

    // Загрузка городов
    useEffect(() => {
        const loadCities = async () => {
            const { data } = await supabase.from('cities').select('*').order('name');
            if (data) setCities(data);
        };
        loadCities();
    }, [supabase]);

    useEffect(() => {
        return () => {
            imagesRef.current.forEach((item) => {
                if (item.type === 'new') URL.revokeObjectURL(item.preview);
            });
        };
    }, []);

    // Загрузка районов при смене города
    useEffect(() => {
        if (!cityId) {
            setDistricts([]);
            setDistrictId('');
            return;
        }
        const loadDistricts = async () => {
            setDistrictsLoading(true);
            const { data } = await supabase
                .from('districts')
                .select('*')
                .eq('city_id', Number(cityId))
                .eq('is_active', true)
                .order('name');
            const districtList = (data as District[]) || [];
            setDistricts(districtList);
            if (districtList.length === 0) {
                setDistrictId('');
            } else if (!districtList.some((district) => district.id === districtId)) {
                setDistrictId(districtList[0].id);
            }
            setDistrictsLoading(false);
        };
        loadDistricts();
    }, [cityId, supabase, districtId]);

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
            selectedFeaturesLength: selectedFeatures.length,
            imagesLength: images.length,
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
        selectedFeatures.length,
        images.length,
    ]);

    useEffect(() => {
        if (!selectedCity || coordinatesInitializedRef.current) {
            return;
        }

        setCoordinates(getCityMapCoordinates(selectedCity.coordinates));
        coordinatesInitializedRef.current = true;
    }, [selectedCity]);

    // Загрузка данных объявления
    useEffect(() => {
        if (!propertyId || authLoading) return;

        const loadProperty = async () => {
            coordinatesInitializedRef.current = false;
            const { data, error: fetchError } = await supabase
                .from('properties')
                .select('*')
                .eq('id', propertyId)
                .single();

            if (fetchError || !data) {
                setError(t('property.notFound'));
                setLoading(false);
                return;
            }

            const property = data as Property;

            // Проверяем, что пользователь владелец
            if (property.user_id !== user?.id) {
                setError(t('common.accessDenied'));
                setLoading(false);
                return;
            }

            setDealType(property.type as 'sale' | 'rent');
            setPropertyType(property.property_type || 'apartment');
            setTitle(property.title);
            setDescription(property.description || '');
            setPrice(String(property.price));
            setArea(String(property.area || ''));
            setRooms(String(property.rooms || ''));
            setCityId(String(property.city_id || ''));
            setDistrictId(property.district_id || '');
            const propertyCoordinates = parseMapCoordinates(property.coordinates);
            setCoordinates(propertyCoordinates);
            coordinatesInitializedRef.current = propertyCoordinates !== null;
            setLocation(property.location || '');
            setIsNewBuilding(property.is_new_building || false);
            setSelectedFeatures((property.features as string[]) || []);
            setImages(
                ((property.images as string[]) || []).map((url) => ({
                    id: url,
                    type: 'existing' as const,
                    url,
                }))
            );
            setLoading(false);
        };

        loadProperty();
    }, [propertyId, user, authLoading, supabase, t]);

    const propertyTypes = [
        { value: 'apartment', label: t('property.apartment') },
        { value: 'house', label: t('property.house') },
        { value: 'commercial', label: t('property.commercial') },
        { value: 'land', label: t('property.land') },
    ];

    const featureOptions = [
        'parking', 'balcony', 'elevator', 'furniture', 'airConditioner', 'internet', 'garden',
    ];

    const handleFiles = (list: FileList | null) => {
        if (!list) return;
        setError(null);
        const availableSlots = MAX_IMAGES - images.length;
        if (availableSlots <= 0) return;

        const incoming = Array.from(list).slice(0, availableSlots);
        const prepared: ImageItem[] = [];

        for (const file of incoming) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (!ALLOWED_EXTENSIONS.includes(ext) || file.size > MAX_IMAGE_SIZE) continue;
            prepared.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type: 'new', file, preview: URL.createObjectURL(file) });
        }
        if (prepared.length) setImages((prev) => [...prev, ...prepared]);
    };

    const removeImage = (id: string) => {
        const item = images.find((img) => img.id === id);
        if (item && item.type === 'new') {
            URL.revokeObjectURL(item.preview);
        }
        setImages((prev) => prev.filter((img) => img.id !== id));
    };

    const moveImageUp = (id: string) => {
        setImages((prev) => {
            const idx = prev.findIndex((img) => img.id === id);
            if (idx <= 0) return prev;
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next;
        });
    };

    const moveImageDown = (id: string) => {
        setImages((prev) => {
            const idx = prev.findIndex((img) => img.id === id);
            if (idx === -1 || idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next;
        });
    };

    const moveImageToFirst = (id: string) => {
        setImages((prev) => {
            const idx = prev.findIndex((img) => img.id === id);
            if (idx <= 0) return prev;
            const item = prev[idx];
            return [item, ...prev.filter((img) => img.id !== id)];
        });
    };

    const toggleFeature = (value: string) => {
        setSelectedFeatures((prev) =>
            prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
        );
    };

    const handleCityChange = (nextCityId: string) => {
        setCityId(nextCityId);

        if (!nextCityId) {
            setCoordinates(null);
            coordinatesInitializedRef.current = true;
            return;
        }

        const nextCity = cities.find((city) => String(city.id) === nextCityId) ?? null;
        setCoordinates(getCityMapCoordinates(nextCity?.coordinates));
        coordinatesInitializedRef.current = true;
    };

    const uploadNewImages = async (): Promise<Map<string, string>> => {
        const urlMap = new Map<string, string>();
        for (const item of images) {
            if (item.type !== 'new') continue;
            const ext = (item.file.name.split('.').pop() || 'jpg').toLowerCase();
            const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg';
            const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
            const filePath = `property-images/${user?.id || 'public'}/${uniqueName}`;

            const { error: uploadError } = await supabase.storage
                .from('properties')
                .upload(filePath, item.file, { contentType: item.file.type || `image/${safeExt}`, upsert: true });

            if (uploadError) throw new Error(uploadError.message);

            const { data } = supabase.storage.from('properties').getPublicUrl(filePath);
            urlMap.set(item.id, data.publicUrl);
        }
        return urlMap;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!user || !propertyId) return;

        if (districtsLoading) {
            setError(t('common.loading'));
            return;
        }

        if (!cityId) {
            setError(t('property.addProperty.validation.cityRequired'));
            return;
        }

        if (
            !title.trim() ||
            !description.trim() ||
            !location.trim() ||
            !price ||
            !area ||
            (supportsRooms && !rooms) ||
            (districtRequired && !districtId)
        ) {
            setError(t('property.addProperty.validation.fillAllFields'));
            return;
        }

        const totalImages = images.length;
        if (totalImages === 0) {
            setError(t('property.addProperty.validation.addAtLeastOnePhoto'));
            return;
        }

        setSubmitting(true);

        try {
            const numericPrice = parseFiniteNumberInput(price);
            const numericArea = parseFiniteNumberInput(area);
            const numericRooms = normalizePropertyRooms(propertyType, rooms);

            if (numericPrice === null || numericArea === null || (supportsRooms && numericRooms === null)) {
                setError(t('filters.validation.invalidNumber'));
                return;
            }

            const urlMap = await uploadNewImages();
            const allImages = images.map((item) => {
                if (item.type === 'existing') return item.url;
                const url = urlMap.get(item.id);
                if (!url) throw new Error('Image upload failed: URL not returned');
                return url;
            });

            const updatePayload = {
                title: title.trim(),
                description: description.trim(),
                price: numericPrice,
                area: numericArea,
                rooms: numericRooms ?? 0,
                city_id: Number(cityId),
                district_id: districtId || null,
                coordinates: serializeMapCoordinates(coordinates ?? getCityMapCoordinates(selectedCity?.coordinates)),
                location: location.trim(),
                type: dealType,
                property_type: propertyType,
                is_new_building: isNewBuilding,
                features: selectedFeatures.length ? selectedFeatures : null,
                images: allImages,
            };

            const { error: updateError } = await supabase
                .from('properties')
                // @ts-expect-error - Supabase update typing resolves payload to never in this route
                .update(updatePayload)
                .eq('id', propertyId);

            if (updateError) throw new Error(updateError.message);

            setSuccess(t('property.updateSuccess'));
            setTimeout(() => router.push('/profil/moji-oglasi'), 1500);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : t('property.updateError'));
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error && !title) {
        return (
            <div className="container mx-auto px-4 py-12">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="py-8">
                        <p className="text-center text-error mb-4">{error}</p>
                        <div className="flex justify-center">
                            <Link href="/profil/moji-oglasi">
                                <Button variant="outline">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    {t('common.back')}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/profil/moji-oglasi">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t('common.back')}
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-text">{t('property.editProperty')}</h1>
                    </div>
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

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    <Card>
                        <CardHeader><CardTitle>{t('addProperty.basicInfo')}</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text">{t('property.dealType')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary font-medium">
                                            {dealType === 'sale' ? t('property.sale') : t('property.rent')}
                                        </span>
                                        <span className="text-xs text-textSecondary self-center">({t('common.notEditable')})</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text">{t('property.propertyType')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-4 py-2 rounded-md bg-primary/10 text-primary border border-primary font-medium">
                                            {propertyTypes.find(pt => pt.value === propertyType)?.label || propertyType}
                                        </span>
                                        <span className="text-xs text-textSecondary self-center">({t('common.notEditable')})</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label={t('property.addProperty.propertyTitle')} value={title} onChange={(e) => setTitle(e.target.value)} required />
                                <Input type="number" label={t('property.price')} value={price} min={0} onChange={(e) => setPrice(e.target.value)} required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input type="number" label={t('property.area')} value={area} min={0} onChange={(e) => setArea(e.target.value)} required />
                                {supportsRooms ? (
                                    <Input type="number" label={t('property.rooms')} value={rooms} min={0} onChange={(e) => setRooms(e.target.value)} required />
                                ) : (
                                    <div />
                                )}
                                <div className="flex items-center gap-3 pt-6">
                                    <input id="new-building" type="checkbox" checked={isNewBuilding} onChange={(e) => setIsNewBuilding(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                    <label htmlFor="new-building" className="text-sm font-medium text-text cursor-pointer">{t('common.newBuildings')}</label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>{t('property.location')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text mb-2">{t('property.city')}</label>
                                    <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary" value={cityId} onChange={(e) => handleCityChange(e.target.value)}>
                                        <option value="">{t('common.selectCity')}</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={city.id}>{t(`cities.${city.name}`, { defaultValue: city.name })}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text mb-2">{t('property.district')}</label>
                                    <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary" value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!cityId || districtsLoading || districts.length === 0}>
                                        <option value="">{districtsLoading ? t('common.loading') : t('common.selectDistrict')}</option>
                                        {districts.map((district) => (
                                            <option key={district.id} value={district.id}>{t(`districts.${district.name}`, { defaultValue: district.name })}</option>
                                        ))}
                                    </select>
                                    {cityId && !districtsLoading && districts.length === 0 ? (
                                        <p className="mt-2 text-sm text-textSecondary">
                                            {t('addProperty.form.noDistricts')}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                            <Input label={t('property.address')} value={location} onChange={(e) => setLocation(e.target.value)} />
                            <PropertyCoordinateSelector
                                selectedCity={selectedCity}
                                value={coordinates}
                                onChange={setCoordinates}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>{t('property.details')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text mb-2">{t('property.description')}</label>
                                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-2">{t('property.features')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {featureOptions.map((feature) => (
                                        <button type="button" key={feature} onClick={() => toggleFeature(feature)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${selectedFeatures.includes(feature) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text hover:border-primary/60'}`}>
                                            {selectedFeatures.includes(feature) ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4 opacity-50" />}
                                            {t(`features.${feature}`, { defaultValue: feature })}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>{t('property.addProperty.photoUpload')}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-textSecondary">
                                    {images.length} / {MAX_IMAGES}
                                </div>
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-text hover:border-primary">
                                    <Upload className="h-4 w-4" />
                                    <span>{t('property.addProperty.addPhoto')}</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                                </label>
                            </div>

                            {images.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {images.map((item, index) => (
                                        <div key={item.id} className="relative group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={item.type === 'existing' ? item.url : item.preview}
                                                alt="property"
                                                className="h-32 w-full rounded-lg object-cover"
                                            />
                                            {index === 0 && (
                                                <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
                                                    {t('property.mainPhoto')}
                                                </span>
                                            )}
                                            <button type="button" onClick={() => removeImage(item.id)} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white">
                                                <X className="h-4 w-4" />
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 rounded-b-lg bg-black/50 px-2 py-1">
                                                <button type="button" onClick={() => moveImageUp(item.id)} disabled={index === 0} className="rounded p-1 text-white disabled:opacity-30" title={t('property.moveUp')}>
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button type="button" onClick={() => moveImageDown(item.id)} disabled={index === images.length - 1} className="rounded p-1 text-white disabled:opacity-30" title={t('property.moveDown')}>
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </button>
                                                {index !== 0 && (
                                                    <button type="button" onClick={() => moveImageToFirst(item.id)} className="rounded p-1 text-white" title={t('property.makeMainPhoto')}>
                                                        <Star className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Link href="/profil/moji-oglasi">
                            <Button type="button" variant="outline">{t('common.cancel')}</Button>
                        </Link>
                        <Button type="submit" disabled={submitting || districtsLoading}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function EditPropertyPageClient() {
    return (
        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <EditPropertyContent />
        </Suspense>
    );
}
