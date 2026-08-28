import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Colors from '../constants/colors';

/**
 * Карточка-скелетон (shimmer-заглушка) для ленты объявлений.
 * Показывается вместо спиннера при загрузке: повторяет форму PropertyCard
 * (фото-блок + строки цены/заголовка/деталей), по которым мягко бежит свечение.
 *
 * Без внешних зависимостей — только встроенный Animated (loop-анимация opacity).
 * Анимация останавливается при размонтировании (cleanup в useEffect).
 */

interface SkeletonCardProps {
  darkMode?: boolean;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ darkMode = false }) => {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
    ])
  );
  animation.start();
  return () => animation.stop();
  }, [pulse]);

  const theme = darkMode ? Colors.dark : Colors.light;
  // Базовый цвет заглушки: чуть темнее фона карточки
  const boneColor = darkMode ? '#2A2A2E' : '#E5E7EB';
  const isWeb = Platform.OS === 'web';

  // Общий стиль «кости»: заливка + пульсация opacity через Animated
  const block = (extraStyles: object) => [
    styles.bone,
    { backgroundColor: boneColor },
    extraStyles,
    { opacity: pulse },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground || (darkMode ? '#1F1F23' : '#FFFFFF') }]}>
      {/* Блок-заглушка фото (соответствует imageContainer PropertyCard) */}
      <View style={[styles.imageContainer, isWeb && styles.imageContainerWeb]}>
        <Animated.View style={block(styles.image)} />
      </View>
      {/* Блок-заглушка информации */}
      <View style={styles.infoContainer}>
        <Animated.View style={block(styles.priceLine)} />
        <Animated.View style={block(styles.titleLine)} />
        <Animated.View style={block(styles.titleShort)} />
        <View style={styles.detailsRow}>
          <Animated.View style={block(styles.detailChip)} />
          <Animated.View style={block(styles.detailChip)} />
          <Animated.View style={block(styles.detailChipSmall)} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 2,
    // Мягкая тень как у PropertyCard
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    height: 110,
    padding: 0,
  },
  imageContainerWeb: {
    height: 160,
  },
  image: {
    flex: 1,
    borderRadius: 0,
  },
  infoContainer: {
    padding: 12,
    gap: 8,
  },
  bone: {
    borderRadius: 6,
  },
  priceLine: {
    height: 18,
    width: '45%',
  },
  titleLine: {
    height: 14,
    width: '85%',
  },
  titleShort: {
    height: 14,
    width: '60%',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  detailChip: {
    height: 12,
    width: 52,
    borderRadius: 6,
  },
  detailChipSmall: {
    height: 12,
    width: 36,
    borderRadius: 6,
  },
});

export default SkeletonCard;
