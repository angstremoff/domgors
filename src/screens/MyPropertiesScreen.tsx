import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../services/propertyService';
import { Ionicons } from '@expo/vector-icons';
import { Property } from '../contexts/PropertyContext';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from '../utils/alertUtils';
import { Logger } from '../utils/logger';

const MyPropertiesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getUserProperties();
      setProperties(data as Property[]);
    } catch (error) {
      Logger.error('Ошибка при загрузке объявлений:', error);
      showErrorAlert(t('profile.errorLoadingProperties'));
    } finally {
      setLoading(false);
    }
  };

  // Мемоизированный обработчик обновления списка
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadProperties();
  }, []);

  const handleEditProperty = (propertyId: string) => {
    navigation.navigate('EditProperty', { propertyId });
  };

  const handleMarkAsSold = async (propertyId: string) => {
    try {
      await propertyService.markAsSold(propertyId);
      showSuccessAlert(t('profile.propertySoldMarked'));
      loadProperties();
    } catch (error) {
      Logger.error('Ошибка при отметке объявления как проданного:', error);
      showErrorAlert(t('profile.errorMarkingProperty'));
    }
  };

  const handleMarkAsRented = async (propertyId: string) => {
    try {
      await propertyService.markAsRented(propertyId);
      showSuccessAlert(t('profile.propertyRentedMarked'));
      loadProperties();
    } catch (error) {
      Logger.error('Ошибка при отметке объявления как сданного:', error);
      showErrorAlert(t('profile.errorMarkingProperty'));
    }
  };

  const handleMarkAsActive = async (propertyId: string) => {
    try {
      await propertyService.markAsActive(propertyId);
      showSuccessAlert(t('profile.propertyActiveMarked'));
      loadProperties();
    } catch (error) {
      Logger.error('Ошибка при отметке объявления как активного:', error);
      showErrorAlert(t('profile.errorMarkingProperty'));
    }
  };

  const handleDeleteProperty = (propertyId: string) => {
    showConfirmAlert(
      t('common.confirm'),
      t('property.confirmDelete'),
      async () => {
        try {
          await propertyService.deleteProperty(propertyId);
          showSuccessAlert(t('property.messages.propertyDeleted'));
          loadProperties();
        } catch (error) {
          Logger.error('Ошибка при удалении объявления:', error);
          showErrorAlert(t('property.errors.deleteFailed'));
        }
      }
    );
  };

  const renderPropertyItem = ({ item }: { item: Property }) => {
    const isForSale = item.type === 'sale';
    const isSold = item.status === 'sold';
    const isRented = item.status === 'rented';
    const isActive = item.status === 'active';
    
    return (
      <View style={[styles.propertyCard, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
          activeOpacity={0.9}
        >
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.propertyImage} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="image-outline" size={48} color={theme.border} />
            </View>
          )}
          
          {(isSold || isRented) && (
            <View style={styles.statusOverlay}>
              <Text style={styles.statusText}>
                {isSold ? t('property.status.sold') : t('property.status.rented')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.propertyDetails}>
          <Text style={[styles.propertyTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.propertyPrice, { color: theme.primary }]}>
            {item.price?.toLocaleString()}€ {!isForSale && '/мес'}
          </Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton, { backgroundColor: theme.primary }]}
            onPress={() => handleEditProperty(item.id)}
          >
            <Text style={styles.buttonText} numberOfLines={1}>{t('common.edit')}</Text>
          </TouchableOpacity>
          
          {isActive && isForSale && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.markButton, { backgroundColor: theme.secondary }]}
              onPress={() => handleMarkAsSold(item.id)}
            >
              <Text style={styles.buttonText} numberOfLines={1}>{t('property.markAsSold')}</Text>
            </TouchableOpacity>
          )}
          
          {isActive && !isForSale && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.markButton, { backgroundColor: theme.secondary }]}
              onPress={() => handleMarkAsRented(item.id)}
            >
              <Text style={styles.buttonText} numberOfLines={1}>{t('property.markAsRented')}</Text>
            </TouchableOpacity>
          )}
          
          {(isSold || isRented) && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.activeButton]}
              onPress={() => handleMarkAsActive(item.id)}
            >
              <Text style={styles.buttonText} numberOfLines={1}>{t('property.backToActive')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton, { backgroundColor: '#D32F2F' }]}
            onPress={() => handleDeleteProperty(item.id)}
          >
            <Text style={styles.buttonText} numberOfLines={1}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={properties}
        renderItem={renderPropertyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={64} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.secondary }]}>{t('profile.noProperties')}</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('AddProperty')}
            >
              <Text style={styles.addButtonText}>{t('property.addNew')}</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      />
      
      {properties.length > 0 && (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddProperty')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyCard: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
  placeholderImage: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyImage: {
    width: '100%',
    height: 180,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  propertyDetails: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonsContainer: {
    flexDirection: 'row',
    padding: 8,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    flex: 1,
    minWidth: 80,
    maxWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
  },
  editButton: {
  },
  markButton: {
  },
  activeButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#388E3C',
  },
  deleteButton: {
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
    textAlign: 'center',
    flexShrink: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 16,
    borderRadius: 32,
    elevation: 4,
  },
});

export default MyPropertiesScreen;
