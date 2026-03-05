import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, Alert, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useBatches, Batch } from '@/context/BatchContext';
import { TagChip } from '@/components/TagChip';
import { StarRating } from '@/components/StarRating';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getCompletionDate(batch: Batch): number {
  const phases = batch.timeline.filter(e => e.type === 'timer_log');
  const lastPhase = phases[phases.length - 1];
  if (lastPhase && lastPhase.type === 'timer_log' && lastPhase.ended_at) {
    return lastPhase.ended_at;
  }
  return batch.created_at;
}

interface CompletedCardProps {
  batch: Batch;
  onRename: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
}

function CompletedCard({ batch, onRename, onDelete }: CompletedCardProps) {
  const completionDate = getCompletionDate(batch);

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/batch/[id]', params: { id: batch.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>{batch.name}</Text>
          <Text style={styles.completedDate}>Completed {formatDate(completionDate)}</Text>
          {batch.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {batch.tags.slice(0, 4).map(tag => (
                <TagChip key={tag} label={tag} small />
              ))}
            </View>
          )}
          <StarRating rating={batch.star_rating} size={18} readonly />
        </View>
        <View style={styles.cardActions}>
          <Pressable onPress={() => onRename(batch)} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => onDelete(batch)} hitSlop={8} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

export default function CompletedBatchesScreen() {
  const insets = useSafeAreaInsets();
  const { batches, deleteBatch, updateBatchName } = useBatches();
  const completedBatches = batches.filter(b => b.status === 'completed');

  const [renameModal, setRenameModal] = useState<{ visible: boolean; batch: Batch | null; name: string }>({
    visible: false,
    batch: null,
    name: '',
  });

  const handleRename = (batch: Batch) => {
    setRenameModal({ visible: true, batch, name: batch.name });
  };

  const handleRenameConfirm = () => {
    if (renameModal.batch && renameModal.name.trim()) {
      updateBatchName(renameModal.batch.id, renameModal.name.trim());
    }
    setRenameModal({ visible: false, batch: null, name: '' });
  };

  const handleDelete = (batch: Batch) => {
    Alert.alert(
      'Delete Batch',
      `Delete "${batch.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteBatch(batch.id);
          },
        },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: Batch }) => (
    <CompletedCard batch={item} onRename={handleRename} onDelete={handleDelete} />
  ), []);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Completed</Text>
          <Text style={styles.headerSub}>
            {completedBatches.length === 0
              ? 'No completed batches'
              : `${completedBatches.length} batch${completedBatches.length > 1 ? 'es' : ''}`}
          </Text>
        </View>
      </View>

      {completedBatches.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="checkmark-circle-outline" size={52} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Nothing yet</Text>
          <Text style={styles.emptyDesc}>Completed batches will appear here for your records.</Text>
        </View>
      ) : (
        <FlatList
          data={completedBatches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={renameModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModal({ visible: false, batch: null, name: '' })}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRenameModal({ visible: false, batch: null, name: '' })}
        >
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rename Batch</Text>
            <TextInput
              style={styles.modalInput}
              value={renameModal.name}
              onChangeText={name => setRenameModal(s => ({ ...s, name }))}
              autoFocus
              placeholder="Batch name"
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setRenameModal({ visible: false, batch: null, name: '' })}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRenameConfirm} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmText}>Rename</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    gap: 6,
    marginRight: 12,
  },
  cardName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
  },
  completedDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  cardActions: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  actionBtn: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.textPrimary,
  },
  modalInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
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
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
