import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  SafeAreaView,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

interface ImageViewerProps {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
  darkMode?: boolean;
}

const { width, height } = Dimensions.get('window');

const ImageViewer = ({ images, visible, initialIndex = 0, onClose, darkMode = false }: ImageViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const theme = darkMode ? Colors.dark : Colors.light;

  // При изменении initialIndex, обновляем текущий индекс и прокручиваем к нему
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      const timeoutId = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false
        });
      }, 100);
      // Cleanup при размонтировании или изменении зависимостей
      return () => clearTimeout(timeoutId);
    }
  }, [initialIndex, visible]);

  // Мемоизированный обработчик скролла
  const handleScroll = useCallback((event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(prevIndex => {
      if (index !== prevIndex) return index;
      return prevIndex;
    });
  }, []);

  // Мемоизированный обработчик перехода к следующему изображению
  const handleNext = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex < images.length - 1) {
        const nextIndex = prevIndex + 1;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true
        });
        return nextIndex;
      }
      return prevIndex;
    });
  }, [images.length]);

  // Мемоизированный обработчик перехода к предыдущему изображению
  const handlePrev = useCallback(() => {
    setCurrentIndex(prevIndex => {
      if (prevIndex > 0) {
        const newIndex = prevIndex - 1;
        flatListRef.current?.scrollToIndex({
          index: newIndex,
          animated: true
        });
        return newIndex;
      }
      return prevIndex;
    });
  }, []);

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.slide}>
      <Image
        source={{ uri: item }}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor={theme.background} barStyle={darkMode ? "light-content" : "dark-content"} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.counterContainer}>
            <Ionicons name="images-outline" size={20} color={theme.text} />
            <View style={styles.textContainer}>
              <Text style={[styles.counter, { color: theme.text }]}>{currentIndex + 1} / {images.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderItem}
            keyExtractor={(_, index) => `image-full-${index}`}
            onScroll={handleScroll}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            initialScrollIndex={initialIndex}
          />

          {/* Кнопки навигации по изображениям */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.navButtonLeft}
              onPress={handlePrev}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
          
          {currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={styles.navButtonRight}
              onPress={handleNext}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-forward" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  carouselContainer: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textContainer: {
    marginLeft: 6,
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height * 0.8,
  },
  navButtonLeft: {
    position: 'absolute',
    top: '50%',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  navButtonRight: {
    position: 'absolute',
    top: '50%',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  }
});

export default ImageViewer;
