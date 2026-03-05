import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface StarRatingProps {
  rating: number | null;
  onRate?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ rating, onRate, size = 28, readonly = false }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating !== null && rating >= star;
        if (readonly) {
          return (
            <Ionicons
              key={star}
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? Colors.star : Colors.border}
            />
          );
        }
        return (
          <Pressable key={star} onPress={() => onRate?.(star)} style={styles.star}>
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? Colors.star : Colors.border}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    padding: 4,
  },
});
