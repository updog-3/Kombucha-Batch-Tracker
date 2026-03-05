import React, { useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useBatches, Batch, TimerLogEntry } from '@/context/BatchContext';
import { TagChip } from '@/components/TagChip';

function BrewingIndicator() {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.brewingDot, { opacity: anim }]} />
  );
}

function isPhaseComplete(phase: TimerLogEntry): boolean {
  if (phase.ended_at !== null) return false;
  const endMs = phase.started_at + phase.duration_days * 24 * 60 * 60 * 1000;
  return Date.now() >= endMs;
}

interface BatchCardProps {
  batch: Batch;
}

function BatchCard({ batch }: BatchCardProps) {
  const { getActivePhaseFn, getPhaseProgress } = useBatches();
  const activePhase = getActivePhaseFn(batch);
  const progress = activePhase ? getPhaseProgress(activePhase) : null;
  const complete = activePhase ? isPhaseComplete(activePhase) : false;

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/batch/[id]', params: { id: batch.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{batch.name}</Text>
          {complete ? (
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>Ready!</Text>
            </View>
          ) : (
            <BrewingIndicator />
          )}
        </View>
        {batch.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {batch.tags.slice(0, 3).map(tag => (
              <TagChip key={tag} label={tag} small />
            ))}
            {batch.tags.length > 3 && (
              <Text style={styles.moreTags}>+{batch.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      <View style={styles.cardBottom}>
        {progress ? (
          <>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(progress.percent * 100, 100)}%`,
                    backgroundColor: complete ? Colors.sage : Colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, complete && styles.progressTextComplete]}>
              {complete ? 'Fermentation complete' : progress.dayStr}
            </Text>
          </>
        ) : (
          <Text style={styles.noPhaseText}>No active phase</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function ActiveBatchesScreen() {
  const insets = useSafeAreaInsets();
  const { batches, isLoading } = useBatches();
  const activeBatches = batches.filter(b => b.status === 'in_progress');

  const handleNew = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/new-batch');
  };

  const renderItem = useCallback(({ item }: { item: Batch }) => (
    <BatchCard batch={item} />
  ), []);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Brewing</Text>
          <Text style={styles.headerSub}>
            {activeBatches.length === 0
              ? 'No active batches'
              : `${activeBatches.length} batch${activeBatches.length > 1 ? 'es' : ''} fermenting`}
          </Text>
        </View>
        <Pressable onPress={handleNew} style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      {isLoading ? null : activeBatches.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="flask-outline" size={52} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No batches yet</Text>
          <Text style={styles.emptyDesc}>Start your first brew and track it here.</Text>
          <Pressable onPress={handleNew} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Start a Batch</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={activeBatches}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPad + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={activeBatches.length > 0}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
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
  cardTop: {
    gap: 8,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  brewingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.sage,
  },
  readyBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  readyBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.accent,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moreTags: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    alignSelf: 'center',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.accent,
    minWidth: 80,
    textAlign: 'right',
  },
  progressTextComplete: {
    color: Colors.sage,
  },
  noPhaseText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    flex: 1,
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
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
  },
});
