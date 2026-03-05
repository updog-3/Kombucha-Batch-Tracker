import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Platform, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { useBatches, Batch, TimerLogEntry } from '@/context/BatchContext';
import { CircularProgress } from '@/components/CircularProgress';
import { TagChip } from '@/components/TagChip';
import { StarRating } from '@/components/StarRating';
import { TimelineEntryCard } from '@/components/TimelineEntryCard';

function isPhaseTimedOut(phase: TimerLogEntry): boolean {
  if (phase.ended_at !== null) return false;
  const endMs = phase.started_at + phase.duration_days * 24 * 60 * 60 * 1000;
  return Date.now() >= endMs;
}

function formatTimeRemaining(phase: TimerLogEntry): string {
  const endMs = phase.started_at + phase.duration_days * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, endMs - Date.now());
  const days = Math.floor(remaining / (24 * 3600 * 1000));
  const hours = Math.floor((remaining % (24 * 3600 * 1000)) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return 'Less than 1h remaining';
}

interface AddMoreTimeModalProps {
  visible: boolean;
  batchId: string;
  onClose: () => void;
}

function AddMoreTimeModal({ visible, batchId, onClose }: AddMoreTimeModalProps) {
  const { addPhase } = useBatches();
  const [days, setDays] = useState(7);
  const [daysInput, setDaysInput] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    const d = parseInt(daysInput, 10);
    if (isNaN(d) || d < 1) return;
    setSubmitting(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addPhase(batchId, d);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Add More Time</Text>
          <Text style={styles.modalDesc}>Extend fermentation with a new phase.</Text>
          <View style={styles.durationRow}>
            <Pressable
              onPress={() => { const d = Math.max(1, days - 1); setDays(d); setDaysInput(String(d)); }}
              style={styles.durationBtn}
            >
              <Ionicons name="remove" size={22} color={Colors.accent} />
            </Pressable>
            <TextInput
              style={styles.durationInput}
              value={daysInput}
              onChangeText={v => { setDaysInput(v); const n = parseInt(v, 10); if (!isNaN(n) && n > 0) setDays(n); }}
              keyboardType="number-pad"
              textAlign="center"
            />
            <Text style={styles.durationUnit}>days</Text>
            <Pressable
              onPress={() => { const d = days + 1; setDays(d); setDaysInput(String(d)); }}
              style={styles.durationBtn}
            >
              <Ionicons name="add" size={22} color={Colors.accent} />
            </Pressable>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} disabled={submitting} style={styles.modalConfirmBtn}>
              <Text style={styles.modalConfirmText}>Start Phase</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface CompleteBatchModalProps {
  visible: boolean;
  batchId: string;
  onClose: () => void;
}

function CompleteBatchModal({ visible, batchId, onClose }: CompleteBatchModalProps) {
  const { completeBatch } = useBatches();
  const [rating, setRating] = useState<number | null>(null);

  const handleComplete = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeBatch(batchId, rating);
    onClose();
    router.back();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Complete Batch</Text>
          <Text style={styles.modalDesc}>How did this batch turn out?</Text>
          <View style={styles.ratingContainer}>
            <StarRating rating={rating} onRate={setRating} size={36} />
          </View>
          <Text style={styles.ratingHint}>
            {rating === null ? 'Tap a star to rate (optional)' : `${rating} star${rating > 1 ? 's' : ''}`}
          </Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleComplete} style={[styles.modalConfirmBtn, { backgroundColor: Colors.sage }]}>
              <Text style={styles.modalConfirmText}>Complete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface EditTagsModalProps {
  visible: boolean;
  batch: Batch;
  onClose: () => void;
}

function EditTagsModal({ visible, batch, onClose }: EditTagsModalProps) {
  const { updateBatchTags, allTags, addCustomTag } = useBatches();
  const [selected, setSelected] = useState<string[]>(batch.tags);
  const [customInput, setCustomInput] = useState('');

  const toggle = (tag: string) => {
    setSelected(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleAddCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    if (!allTags.includes(t)) addCustomTag(t);
    if (!selected.includes(t)) setSelected(prev => [...prev, t]);
    setCustomInput('');
  };

  const handleSave = () => {
    updateBatchTags(batch.id, selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalBox, styles.modalBoxLarge]} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Edit Tags</Text>
          <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
            <View style={styles.tagsGrid}>
              {allTags.map(tag => (
                <TagChip
                  key={tag}
                  label={tag}
                  selected={selected.includes(tag)}
                  onPress={() => toggle(tag)}
                />
              ))}
            </View>
          </ScrollView>
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Add custom tag..."
              placeholderTextColor={Colors.textMuted}
              onSubmitEditing={handleAddCustom}
            />
            <Pressable
              onPress={handleAddCustom}
              style={[styles.customTagBtn, !customInput.trim() && styles.customTagBtnDisabled]}
              disabled={!customInput.trim()}
            >
              <Text style={styles.customTagBtnText}>Add</Text>
            </Pressable>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.modalConfirmBtn}>
              <Text style={styles.modalConfirmText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface AddNoteModalProps {
  visible: boolean;
  batchId: string;
  onClose: () => void;
}

function AddNoteModal({ visible, batchId, onClose }: AddNoteModalProps) {
  const { addNote } = useBatches();
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (!content.trim()) return;
    addNote(batchId, content.trim(), Date.now());
    setContent('');
    onClose();
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Add Note</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your observation..."
            placeholderTextColor={Colors.textMuted}
            multiline
            autoFocus
            textAlignVertical="top"
          />
          <View style={styles.modalActions}>
            <Pressable onPress={() => { setContent(''); onClose(); }} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!content.trim()}
              style={[styles.modalConfirmBtn, !content.trim() && { backgroundColor: Colors.border }]}
            >
              <Text style={styles.modalConfirmText}>Add Note</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { batches, updateBatchName, addPhoto, getActivePhaseFn, getPhaseProgress } = useBatches();

  const batch = batches.find(b => b.id === id);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(batch?.name ?? '');
  const [showAddMoreTime, setShowAddMoreTime] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showEditTags, setShowEditTags] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  useEffect(() => {
    if (batch) setNameInput(batch.name);
  }, [batch?.name]);

  const handleSaveName = () => {
    if (nameInput.trim() && batch) {
      updateBatchName(batch.id, nameInput.trim());
    } else if (batch) {
      setNameInput(batch.name);
    }
    setEditingName(false);
  };

  const handleAddPhoto = async () => {
    if (!batch) return;
    const photoCount = batch.timeline.filter(e => e.type === 'photo').length;
    if (photoCount >= 15) {
      Alert.alert('Photo limit', 'Maximum 15 photos per batch.');
      return;
    }

    Alert.alert('Add Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled && result.assets[0]) {
            addPhoto(batch.id, result.assets[0].uri, Date.now());
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Photo library permission is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });
          if (!result.canceled && result.assets[0]) {
            addPhoto(batch.id, result.assets[0].uri, Date.now());
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!batch) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.notFound}>Batch not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const activePhase = getActivePhaseFn(batch);
  const progress = activePhase ? getPhaseProgress(activePhase) : null;
  const timedOut = activePhase ? isPhaseTimedOut(activePhase) : false;
  const isCompleted = batch.status === 'completed';

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.sage} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        )}
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.nameSectionRow}>
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
            />
          ) : (
            <Pressable onPress={() => !isCompleted && setEditingName(true)} style={{ flex: 1 }}>
              <Text style={styles.batchName}>{batch.name}</Text>
            </Pressable>
          )}
          {!isCompleted && !editingName && (
            <Pressable onPress={() => setEditingName(true)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {batch.tags.map(tag => <TagChip key={tag} label={tag} small />)}
          {!isCompleted && (
            <Pressable onPress={() => setShowEditTags(true)} style={styles.editTagsBtn}>
              <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
              <Text style={styles.editTagsText}>Tags</Text>
            </Pressable>
          )}
        </View>

        {/* Star rating for completed */}
        {isCompleted && (
          <View style={styles.starRow}>
            <StarRating rating={batch.star_rating} size={24} readonly />
          </View>
        )}

        {/* Progress ring */}
        <View style={styles.progressContainer}>
          {activePhase && progress ? (
            <>
              <CircularProgress
                percent={progress.percent}
                size={160}
                label={timedOut ? 'Ready!' : progress.dayStr}
                sublabel={timedOut ? 'Tap below to proceed' : formatTimeRemaining(activePhase)}
                isComplete={timedOut}
              />
              <Text style={styles.phaseName}>{activePhase.phase_name}</Text>
            </>
          ) : isCompleted ? (
            <CircularProgress
              percent={1}
              size={160}
              label="Done"
              sublabel="Batch complete"
              isComplete
            />
          ) : (
            <View style={styles.noPhase}>
              <Ionicons name="timer-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.noPhaseText}>No active phase</Text>
            </View>
          )}
        </View>

        {/* Timer action banner */}
        {timedOut && !isCompleted && (
          <View style={styles.timerBanner}>
            <View style={styles.timerBannerContent}>
              <Ionicons name="checkmark-circle-outline" size={24} color={Colors.sage} />
              <Text style={styles.timerBannerText}>Fermentation complete!</Text>
            </View>
            <View style={styles.timerBannerActions}>
              <Pressable
                onPress={() => setShowAddMoreTime(true)}
                style={styles.timerBannerBtn}
              >
                <Ionicons name="time-outline" size={16} color={Colors.accent} />
                <Text style={styles.timerBannerBtnText}>Add More Time</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowComplete(true)}
                style={[styles.timerBannerBtn, styles.timerBannerBtnPrimary]}
              >
                <Ionicons name="checkmark" size={16} color={Colors.white} />
                <Text style={[styles.timerBannerBtnText, { color: Colors.white }]}>Complete</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {batch.timeline.length === 0 ? (
            <Text style={styles.emptyTimeline}>No entries yet.</Text>
          ) : (
            [...batch.timeline]
              .sort((a, b) => {
                const aDate = a.type === 'timer_log' ? a.started_at : a.date;
                const bDate = b.type === 'timer_log' ? b.started_at : b.date;
                return aDate - bDate;
              })
              .map(entry => (
                <TimelineEntryCard
                  key={entry.id}
                  entry={entry}
                  batchId={batch.id}
                  isActivePhase={
                    entry.type === 'timer_log' && activePhase?.id === entry.id
                  }
                  readonly={isCompleted}
                />
              ))
          )}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      {!isCompleted && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={() => setShowAddNote(true)}
            style={({ pressed }) => [styles.bottomBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.accent} />
            <Text style={styles.bottomBtnText}>Add Note</Text>
          </Pressable>
          <View style={styles.bottomDivider} />
          <Pressable
            onPress={handleAddPhoto}
            style={({ pressed }) => [styles.bottomBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="camera-outline" size={20} color={Colors.blue} />
            <Text style={[styles.bottomBtnText, { color: Colors.blue }]}>Add Photo</Text>
          </Pressable>
        </View>
      )}

      <AddMoreTimeModal
        visible={showAddMoreTime}
        batchId={batch.id}
        onClose={() => setShowAddMoreTime(false)}
      />
      <CompleteBatchModal
        visible={showComplete}
        batchId={batch.id}
        onClose={() => setShowComplete(false)}
      />
      <EditTagsModal
        visible={showEditTags}
        batch={batch}
        onClose={() => setShowEditTags(false)}
      />
      <AddNoteModal
        visible={showAddNote}
        batchId={batch.id}
        onClose={() => setShowAddNote(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    fontSize: 17,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  backLink: { marginTop: 12 },
  backLinkText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.sageLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.sage,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  nameSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  batchName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  nameInput: {
    flex: 1,
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  editTagsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editTagsText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.accent,
  },
  starRow: {
    marginBottom: 12,
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  phaseName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  noPhase: {
    alignItems: 'center',
    gap: 8,
  },
  noPhaseText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  timerBanner: {
    backgroundColor: Colors.sageLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.sage + '44',
  },
  timerBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBannerText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  timerBannerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  timerBannerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  timerBannerBtnPrimary: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
  },
  timerBannerBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.accent,
  },
  timelineSection: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  emptyTimeline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  bottomBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.accent,
  },
  bottomDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalBoxLarge: {
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: -8,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    overflow: 'hidden',
  },
  durationBtn: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationInput: {
    flex: 1,
    fontSize: 22,
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
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  ratingHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
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
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
  },
  noteInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
