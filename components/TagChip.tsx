import React from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface TagChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}

export function TagChip({ label, selected = false, onPress, small = false }: TagChipProps) {
  if (!onPress) {
    return (
      <View style={[styles.chip, small && styles.chipSmall, selected && styles.chipSelected]}>
        <Text style={[styles.label, small && styles.labelSmall, selected && styles.labelSelected]}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        small && styles.chipSmall,
        selected && styles.chipSelected,
        pressed && styles.chipPressed,
      ]}
    >
      <Text style={[styles.label, small && styles.labelSmall, selected && styles.labelSelected]}>
        {label}
      </Text>
      {selected && (
        <Ionicons
          name="checkmark"
          size={small ? 10 : 12}
          color={Colors.white}
          style={styles.icon}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tagBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipSelected: {
    backgroundColor: Colors.accent,
  },
  chipPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.tagText,
  },
  labelSmall: {
    fontSize: 11,
  },
  labelSelected: {
    color: Colors.white,
  },
  icon: {
    marginLeft: 2,
  },
});
