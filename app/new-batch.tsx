import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useBatches } from '@/context/BatchContext';
import { TagChip } from '@/components/TagChip';

const DEFAULT_DURATION = 14;

export default function NewBatchScreen() {
  const insets = useSafeAreaInsets();
  const { createBatch, allTags, addCustomTag, requestNotificationPermission } = useBatches();

  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION);
  const [durationInput, setDurationInput] = useState(String(DEFAULT_DURATION));
  const [customTagInput, setCustomTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    requestNotificationPermission().then(setNotifGranted);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!allTags.includes(trimmed)) {
      addCustomTag(trimmed);
    }
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags(prev => [...prev, trimmed]);
    }
    setCustomTagInput('');
  };

  const handleDurationChange = (val: string) => {
    setDurationInput(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) setDurationDays(n);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for your batch.');
      return;
    }
    const days = parseInt(durationInput, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert('Invalid duration', 'Please enter a valid number of days.');
      return;
    }
    setSubmitting(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await createBatch(name.trim(), selectedTags, note, days);
      router.back();
    } catch {
      setSubmitting(false);
      Alert.alert('Error', 'Could not create batch. Please try again.');
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Batch</Text>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || !name.trim()}
          style={[styles.createBtn, (submitting || !name.trim()) && styles.createBtnDisabled]}
        >
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Batch Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Spring Earl Grey"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
        </View>

        {/* Fermentation Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>Fermentation Duration</Text>
          <Text style={styles.labelHint}>Phase I length — you can add more time later</Text>
          <View style={styles.durationRow}>
            <Pressable
              onPress={() => {
                const d = Math.max(1, durationDays - 1);
                setDurationDays(d);
                setDurationInput(String(d));
              }}
              style={styles.durationBtn}
            >
              <Ionicons name="remove" size={22} color={Colors.accent} />
            </Pressable>
            <TextInput
              style={styles.durationInput}
              value={durationInput}
              onChangeText={handleDurationChange}
              keyboardType="number-pad"
              textAlign="center"
            />
            <Text style={styles.durationUnit}>days</Text>
            <Pressable
              onPress={() => {
                const d = durationDays + 1;
                setDurationDays(d);
                setDurationInput(String(d));
              }}
              style={styles.durationBtn}
            >
              <Ionicons name="add" size={22} color={Colors.accent} />
            </Pressable>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagsContainer}>
            {allTags.map(tag => (
              <TagChip
                key={tag}
                label={tag}
                selected={selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              value={customTagInput}
              onChangeText={setCustomTagInput}
              placeholder="Add custom tag..."
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={handleAddCustomTag}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleAddCustomTag}
              style={[styles.customTagBtn, !customTagInput.trim() && styles.customTagBtnDisabled]}
              disabled={!customTagInput.trim()}
            >
              <Text style={styles.customTagBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>

        {/* Initial Note */}
        <View style={styles.section}>
          <Text style={styles.label}>Opening Note</Text>
          <Text style={styles.labelHint}>Optional — describe your recipe, ingredients, etc.</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. 1 cup honey, 8 bags jasmine green tea..."
            placeholderTextColor={Colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        {!notifGranted && Platform.OS !== 'web' && (
          <View style={styles.notifWarning}>
            <Ionicons name="notifications-off-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.notifWarningText}>
              Enable notifications to get alerted when fermentation is complete.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  createBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createBtnDisabled: {
    backgroundColor: Colors.border,
  },
  createBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 8,
  },
  section: {
    gap: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteInput: {
    minHeight: 100,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  durationBtn: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  durationUnit: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    paddingRight: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customTagBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTagBtnDisabled: {
    backgroundColor: Colors.border,
  },
  customTagBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  notifWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  notifWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
