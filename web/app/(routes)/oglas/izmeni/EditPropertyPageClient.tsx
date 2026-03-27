'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2, Upload, X, Check, MapPin, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import type { Database } from '@shared/lib/database.types';
import { normalizePropertyRooms, parseFiniteNumberInput, propertyTypeSupportsRooms } from '@shared/utils/propertyRules';

type City = Database['public']['Tables']['cities']['Row'];
type District = Database['public']['Tables']['districts']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

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
    const [location, setLocation] = useState('');
    const [isNewBuilding, setIsNewBuilding] = useState(false);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [districtsLoading, setDistrictsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const supportsRooms = propertyTypeSupportsRooms(propertyType);

    // Загрузка городов
    useEffect(() => {
        const loadCities = async () => {
            const { data } = await supabase.from('cities').select('*').order('name');
            if (data) setCities(data);
        };
        loadCities();
    }, [supabase]);

    // Загрузка районов при смене города
    useEffect(() => {
        if (!cityId) {
            setDistricts([]);
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
            setDistricts((data as District[]) || []);
            setDistrictsLoading(false);
        };
        loadDistricts();
    }, [cityId, supabase]);

    useEffect(() => {
        if (!supportsRooms && rooms) {
            setRooms('');
        }
    }, [supportsRooms, rooms]);

    // Загрузка данных объявления
    useEffect(() => {
        if (!propertyId || authLoading) return;

        const loadProperty = async () => {
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
            setLocation(property.location || '');
            setIsNewBuilding(property.is_new_building || false);
            setSelectedFeatures((property.features as string[]) || []);
            setExistingImages((property.images as string[]) || []);
            setLoading(false);
        };

        loadProperty();
    }, [propertyId, user, authLoading, supabase, t]);

    const propertyTypes = [
        { value: 'apartment', label: t('property.apartment') },
        { value: 'house', label: t('property.house') },
        { value: 'commercial', label: t('property.commercial') },
        { value: 'land', label: t('property.land') },
        { value: 'garage', label: t('property.garage') },
    ];

    const featureOptions = [
        'parking', 'balcony', 'elevator', 'furniture', 'airConditioner', 'internet', 'garden',
    ];

    const handleFiles = (list: FileList | null) => {
        if (!list) return;
        setError(null);
        const currentCount = existingImages.length + newFiles.length;
        const availableSlots = MAX_IMAGES - currentCount;
        if (availableSlots <= 0) return;

        const incoming = Array.from(list).slice(0, availableSlots);
        const prepared: { file: File; preview: string }[] = [];

        for (const file of incoming) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (!ALLOWED_EXTENSIONS.includes(ext) || file.size > MAX_IMAGE_SIZE) continue;
            prepared.push({ file, preview: URL.createObjectURL(file) });
        }
        if (prepared.length) setNewFiles((prev) => [...prev, ...prepared]);
    };

    const removeExistingImage = (url: string) => {
        setExistingImages((prev) => prev.filter((img) => img !== url));
    };

    const removeNewFile = (preview: string) => {
        URL.revokeObjectURL(preview);
        setNewFiles((prev) => prev.filter((item) => item.preview !== preview));
    };

    const toggleFeature = (value: string) => {
        setSelectedFeatures((prev) =>
            prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
        );
    };

    const uploadNewImages = async () => {
        const uploaded: string[] = [];
        for (const item of newFiles) {
            const ext = (item.file.name.split('.').pop() || 'jpg').toLowerCase();
            const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : 'jpg';
            const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
            const filePath = `property-images/${user?.id || 'public'}/${uniqueName}`;

            const { error: uploadError } = await supabase.storage
                .from('properties')
                .upload(filePath, item.file, { contentType: item.file.type || `image/${safeExt}`, upsert: true });

            if (uploadError) throw new Error(uploadError.message);

            const { data } = supabase.storage.from('properties').getPublicUrl(filePath);
            uploaded.push(data.publicUrl);
        }
        return uploaded;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!user || !propertyId) return;

        if (!title.trim() || !description.trim() || !location.trim() || !cityId || !districtId || !price || !area || (supportsRooms && !rooms)) {
            setError(t('property.addProperty.validation.fillAllFields'));
            return;
        }

        const totalImages = existingImages.length + newFiles.length;
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

            const newImageUrls = await uploadNewImages();
            const allImages = [...existingImages, ...newImageUrls];

            const updatePayload = {
                title: title.trim(),
                description: description.trim(),
                price: numericPrice,
                area: numericArea,
                rooms: numericRooms ?? 0,
                city_id: Number(cityId),
                district_id: districtId,
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>{t('property.addProperty.basicInfo')}</CardTitle></CardHeader>
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
                                    <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary" value={cityId} onChange={(e) => setCityId(e.target.value)}>
                                        <option value="">{t('common.selectCity')}</option>
                                        {cities.map((city) => (
                                            <option key={city.id} value={city.id}>{t(`cities.${city.name}`, { defaultValue: city.name })}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text mb-2">{t('property.district')}</label>
                                    <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary" value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!cityId || districtsLoading}>
                                        <option value="">{districtsLoading ? t('common.loading') : t('common.selectDistrict')}</option>
                                        {districts.map((district) => (
                                            <option key={district.id} value={district.id}>{t(`districts.${district.name}`, { defaultValue: district.name })}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <Input label={t('property.address')} value={location} onChange={(e) => setLocation(e.target.value)} />
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
                                    {existingImages.length + newFiles.length} / {MAX_IMAGES}
                                </div>
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-text hover:border-primary">
                                    <Upload className="h-4 w-4" />
                                    <span>{t('property.addProperty.addPhoto')}</span>
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                                </label>
                            </div>

                            {(existingImages.length > 0 || newFiles.length > 0) && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {existingImages.map((url) => (
                                        <div key={url} className="relative group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt="property" className="h-32 w-full rounded-lg object-cover" />
                                            <button type="button" onClick={() => removeExistingImage(url)} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {newFiles.map((item) => (
                                        <div key={item.preview} className="relative group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.preview} alt="preview" className="h-32 w-full rounded-lg object-cover" />
                                            <button type="button" onClick={() => removeNewFile(item.preview)} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition">
                                                <X className="h-4 w-4" />
                                            </button>
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
                        <Button type="submit" disabled={submitting}>
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
