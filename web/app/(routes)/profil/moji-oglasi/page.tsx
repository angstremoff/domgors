'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, RotateCcw, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import type { Database, TablesUpdate } from '@shared/lib/database.types';
import { extractPropertyImagePath } from '@shared/utils/propertyStorage';

type PropertyWithRelations = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export default function MojiOglasiPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<PropertyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const supabase = createClient();
  const { t } = useTranslation();

  const loadProperties = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setProperties([]);
      return;
    }

    const { data } = await supabase
      .from('properties')
      .select(`
        *,
        city:cities(name),
        district:districts(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setProperties((data as PropertyWithRelations[]) || []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const updatePropertyStatus = async (propertyId: string, status: 'active' | 'sold' | 'rented') => {
    if (!user) {
      return;
    }

    const updatePayload: TablesUpdate<'properties'> = { status };

    setActionLoading(propertyId);
    await supabase
      .from('properties')
      // @ts-expect-error - Supabase update typing resolves payload to never in this route
      .update(updatePayload)
      .eq('id', propertyId)
      .eq('user_id', user.id);
    await loadProperties();
    setActionLoading(null);
  };

  const handleMarkAsSold = async (propertyId: string) => {
    await updatePropertyStatus(propertyId, 'sold');
  };

  const handleMarkAsRented = async (propertyId: string) => {
    await updatePropertyStatus(propertyId, 'rented');
  };

  const handleMarkAsActive = async (propertyId: string) => {
    await updatePropertyStatus(propertyId, 'active');
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm(t('property.confirmDelete'))) return;

    setActionLoading(propertyId);

    // Сначала получаем объявление для списка фото
    const property = properties.find(p => p.id === propertyId);

    // Удаляем фото из Storage
    if (property?.images && Array.isArray(property.images)) {
      for (const imageUrl of property.images as string[]) {
        const storagePath = extractPropertyImagePath(imageUrl);
        if (storagePath) {
          await supabase.storage.from('properties').remove([storagePath]);
        }
      }
    }

    // Удаляем запись из базы
    await supabase.from('properties').delete().eq('id', propertyId).eq('user_id', user?.id ?? '');
    await loadProperties();
    setActionLoading(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'sold') {
      return <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">{t('property.status.sold')}</span>;
    }
    if (status === 'rented') {
      return <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full">{t('property.status.rented')}</span>;
    }
    return <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">{t('property.status.active')}</span>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">{t('profile.myProperties')}</h1>
          <p className="text-textSecondary">
            {t('profile.myPropertiesCount', { count: properties.length })}
          </p>
        </div>

        <Link href="/oglas/novi">
          <Button>
            <Plus className="h-5 w-5 mr-2" />
            {t('property.add')}
          </Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-textSecondary text-lg">{t('profile.noProperties')}</div>
              <Link href="/oglas/novi">
                <Button>
                  <Plus className="h-5 w-5 mr-2" />
                  {t('property.addNew')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => {
            const isForSale = property.type === 'sale';
            const isSold = property.status === 'sold';
            const isRented = property.status === 'rented';
            const isActive = property.status === 'active';
            const isLoading = actionLoading === property.id;

            return (
              <Card key={property.id} className="overflow-hidden">
                {/* Изображение */}
                <Link href={`/oglas/?id=${property.id}`} className="block relative h-48 overflow-hidden">
                  <Image
                    src={property.images?.[0] || '/placeholder-property.jpg'}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                  {/* Статус overlay для проданных/сданных */}
                  {(isSold || isRented) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {isSold ? t('property.status.sold') : t('property.status.rented')}
                      </span>
                    </div>
                  )}
                </Link>

                <CardContent className="p-4">
                  {/* Заголовок и статус */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text line-clamp-1 flex-1">{property.title}</h3>
                    {getStatusBadge(property.status)}
                  </div>

                  {/* Цена */}
                  <div className="text-xl font-bold text-primary mb-2">
                    {formatPrice(property.price)}
                    {!isForSale && <span className="text-sm font-normal text-textSecondary">/{t('property.month')}</span>}
                  </div>

                  {/* Локация */}
                  <div className="flex items-center gap-1 text-sm text-textSecondary mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {property.city?.name}
                      {property.district?.name && `, ${property.district.name}`}
                    </span>
                  </div>

                  {/* Кнопки действий */}
                  <div className="flex flex-wrap gap-2">
                    {/* Редактировать */}
                    <Link href={`/oglas/izmeni/?id=${property.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full" disabled={isLoading}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        {t('common.edit')}
                      </Button>
                    </Link>

                    {/* Удалить */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleDelete(property.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>

                  {/* Кнопки статуса */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isActive && isForSale && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleMarkAsSold(property.id)}
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('property.markAsSold')}
                      </Button>
                    )}

                    {isActive && !isForSale && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleMarkAsRented(property.id)}
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('property.markAsRented')}
                      </Button>
                    )}

                    {(isSold || isRented) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-500 border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                        onClick={() => handleMarkAsActive(property.id)}
                        disabled={isLoading}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {t('property.backToActive')}
                      </Button>
                    )}
                  </div>

                  {isLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
