import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Image, Modal, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { TimelineEntry, NoteEntry, PhotoEntry, TimerLogEntry, useBatches } from '@/context/BatchContext';
import * as Haptics from 'expo-haptics';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateFull(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface NoteCardProps {
  entry: NoteEntry;
  batchId: string;
  readonly?: boolean;
}

function NoteCard({ entry, batchId, readonly = false }: NoteCardProps) {
  const { updateNote, deleteEntry } = useBatches();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);

  const handleSave = () => {
    if (content.trim()) {
      updateNote(batchId, entry.id, content.trim(), entry.date);
    }
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(batchId, entry.id) },
    ]);
  };

  return (
    <View style={[styles.card, styles.noteCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeDot, { backgroundColor: Colors.accent }]} />
          <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
        </View>
        {!readonly && (
          <View style={styles.cardActions}>
            <Pressable onPress={() => setEditing(true)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            </Pressable>
          </View>
        )}
      </View>
      {editing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.editInput}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => { setContent(entry.content); setEditing(false); }} style={styles.editBtn}>
              <Text style={styles.editBtnCancel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={[styles.editBtn, styles.editBtnPrimary]}>
              <Text style={styles.editBtnPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.noteContent}>{entry.content}</Text>
      )}
    </View>
  );
}

interface PhotoCardProps {
  entry: PhotoEntry;
  batchId: string;
  readonly?: boolean;
}

function PhotoCard({ entry, batchId, readonly = false }: PhotoCardProps) {
  const { deleteEntry } = useBatches();
  const [fullscreen, setFullscreen] = useState(false);

  const handleDelete = () => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(batchId, entry.id) },
    ]);
  };

  return (
    <>
      <View style={[styles.card, styles.photoCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.typeDot, { backgroundColor: Colors.blue }]} />
            <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
          </View>
          {!readonly && (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setFullscreen(true)}>
          <Image
            source={{ uri: entry.image_data }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </Pressable>
      </View>
      <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <Pressable style={styles.fullscreenOverlay} onPress={() => setFullscreen(false)}>
          <Image source={{ uri: entry.image_data }} style={styles.fullscreenImage} resizeMode="contain" />
          <Pressable style={styles.closeBtn} onPress={() => setFullscreen(false)}>
            <Ionicons name="close-circle" size={36} color={Colors.white} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface TimerCardProps {
  entry: TimerLogEntry;
  batchId: string;
  isActive?: boolean;
  readonly?: boolean;
}

function TimerCard({ entry, batchId, isActive = false, readonly = false }: TimerCardProps) {
  const { updatePhaseName, getPhaseProgress } = useBatches();
  const [editing, setEditing] = useState(false);
  const [phaseName, setPhaseName] = useState(entry.phase_name);

  const progress = getPhaseProgress(entry);

  const handleSave = () => {
    if (phaseName.trim()) {
      updatePhaseName(batchId, entry.id, phaseName.trim());
    }
    setEditing(false);
  };

  const endDate = new Date(entry.started_at + entry.duration_days * 24 * 60 * 60 * 1000);

  return (
    <View style={[styles.card, styles.timerCard, isActive && styles.timerCardActive]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeDot, { backgroundColor: Colors.sage }]} />
          <Ionicons name="timer-outline" size={14} color={Colors.sage} style={{ marginRight: 2 }} />
          {editing && !readonly ? (
            <TextInput
              style={styles.phaseInput}
              value={phaseName}
              onChangeText={setPhaseName}
              autoFocus
              onBlur={handleSave}
              onSubmitEditing={handleSave}
            />
          ) : (
            <Pressable onPress={() => !readonly && setEditing(true)} disabled={readonly}>
              <Text style={styles.phaseLabel}>{entry.phase_name}</Text>
            </Pressable>
          )}
          {!readonly && !editing && (
            <Pressable onPress={() => setEditing(true)} hitSlop={8} style={{ marginLeft: 4 }}>
              <Ionicons name="pencil-outline" size={13} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        {isActive && (
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>Active</Text>
          </View>
        )}
      </View>
      <View style={styles.timerDetails}>
        <Text style={styles.timerDuration}>{entry.duration_days} days</Text>
        <Text style={styles.timerDates}>
          {formatDate(entry.started_at)} →{' '}
          {entry.ended_at ? formatDate(entry.ended_at) : formatDate(endDate.getTime())}
        </Text>
        {isActive && (
          <Text style={styles.timerProgress}>{progress.dayStr}</Text>
        )}
      </View>
    </View>
  );
}

interface TimelineEntryCardProps {
  entry: TimelineEntry;
  batchId: string;
  isActivePhase?: boolean;
  readonly?: boolean;
}

export function TimelineEntryCard({ entry, batchId, isActivePhase = false, readonly = false }: TimelineEntryCardProps) {
  if (entry.type === 'note') return <NoteCard entry={entry} batchId={batchId} readonly={readonly} />;
  if (entry.type === 'photo') return <PhotoCard entry={entry} batchId={batchId} readonly={readonly} />;
  if (entry.type === 'timer_log') return <TimerCard entry={entry} batchId={batchId} isActive={isActivePhase} readonly={readonly} />;
  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  noteCard: {
    borderLeftColor: Colors.accent,
  },
  photoCard: {
    borderLeftColor: Colors.blue,
  },
  timerCard: {
    borderLeftColor: Colors.sage,
  },
  timerCardActive: {
    backgroundColor: Colors.sageLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  noteContent: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  phaseLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.sage,
  },
  phaseInput: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.sage,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sage,
    minWidth: 80,
    padding: 0,
  },
  timerDetails: {
    gap: 2,
  },
  timerDuration: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  timerDates: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  timerProgress: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.sage,
    marginTop: 4,
  },
  activePill: {
    backgroundColor: Colors.sage,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
  editContainer: {
    gap: 8,
  },
  editInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editBtnCancel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  editBtnPrimary: {
    backgroundColor: Colors.accent,
  },
  editBtnPrimaryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.white,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '90%',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
