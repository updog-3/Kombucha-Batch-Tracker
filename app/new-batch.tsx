import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useBatches } from '@/context/BatchContext';
import { TagChip } from '@/components/TagChip';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { DEBUG_MODE } from '@/constants/debug';

const DEFAULT_DURATION = 14;
const STEP = DEBUG_MODE ? 0.1 : 1;

export default function NewBatchScreen() {
  const insets = useSafeAreaInsets();
  const { createBatch, allTags, addCustomTag, requestNotificationPermission } = useBatches();

  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [durationDays, setDurationDays] = useState(DEBUG_MODE ? 0.1 : DEFAULT_DURATION);
  const [durationInput, setDurationInput] = useState(DEBUG_MODE ? '0.1' : String(DEFAULT_DURATION));
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
    if (!allTags.includes(trimmed)) addCustomTag(trimmed);
    if (!selectedTags.includes(trimmed)) setSelectedTags(prev => [...prev, trimmed]);
    setCustomTagInput('');
  };

  const handleDurationChange = (val: string) => {
    setDurationInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) setDurationDays(n);
  };

  const stepDuration = (dir: 1 | -1) => {
    const newVal = Math.max(STEP, parseFloat((durationDays + dir * STEP).toFixed(2)));
    setDurationDays(newVal);
    setDurationInput(DEBUG_MODE ? String(newVal) : String(Math.round(newVal)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for your batch.');
      return;
    }
    const days = parseFloat(durationInput);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Invalid duration', 'Please enter a valid duration.');
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>New Batch</Text>
          {DEBUG_MODE && (
            <View style={styles.debugBadge}>
              <Text style={styles.debugBadgeText}>DEBUG</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || !name.trim()}
          style={[styles.createBtn, (submitting || !name.trim()) && styles.createBtnDisabled]}
        >
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={60}
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

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>Fermentation Duration</Text>
          <Text style={styles.labelHint}>
            Phase I length — you can add more time later
            {DEBUG_MODE ? '  (debug: decimal values enabled)' : ''}
          </Text>
          <View style={styles.durationRow}>
            <Pressable onPress={() => stepDuration(-1)} style={styles.durationBtn}>
              <Ionicons name="remove" size={22} color={Colors.accent} />
            </Pressable>
            <TextInput
              style={styles.durationInput}
              value={durationInput}
              onChangeText={handleDurationChange}
              keyboardType={DEBUG_MODE ? 'decimal-pad' : 'number-pad'}
              textAlign="center"
            />
            <Text style={styles.durationUnit}>days</Text>
            <Pressable onPress={() => stepDuration(1)} style={styles.durationBtn}>
              <Ionicons name="add" size={22} color={Colors.accent} />
            </Pressable>
          </View>
          {DEBUG_MODE && (
            <Text style={styles.debugHint}>
              {(durationDays * 24).toFixed(2)} hours · {(durationDays * 24 * 60).toFixed(0)} minutes
            </Text>
          )}
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

        {/* Opening Note */}
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
      </KeyboardAwareScrollViewCompat>
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  debugBadge: {
    backgroundColor: Colors.star,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  debugBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
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
  },
  section: {
    gap: 8,
    marginBottom: 24,
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
    minHeight: 120,
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
  debugHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.star,
    textAlign: 'center',
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
  },
  notifWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
