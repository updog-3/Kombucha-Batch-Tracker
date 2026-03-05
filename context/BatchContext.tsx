import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NoteEntry {
  id: string;
  type: 'note';
  content: string;
  date: number;
}

export interface PhotoEntry {
  id: string;
  type: 'photo';
  image_data: string;
  date: number;
}

export interface TimerLogEntry {
  id: string;
  type: 'timer_log';
  phase_name: string;
  duration_days: number;
  started_at: number;
  ended_at: number | null;
  notification_id: string | null;
}

export type TimelineEntry = NoteEntry | PhotoEntry | TimerLogEntry;

export interface Batch {
  id: string;
  name: string;
  tags: string[];
  status: 'in_progress' | 'completed';
  star_rating: number | null;
  created_at: number;
  timeline: TimelineEntry[];
}

const DEFAULT_TAGS = [
  'Black Tea', 'Green Tea', 'Oolong Tea', 'White Tea', 'Herbal Tea',
  'Honey', 'Sugar', 'Cane Sugar', 'Fruit',
];

const STORAGE_KEY = 'kombucha_batches';
const CUSTOM_TAGS_KEY = 'kombucha_custom_tags';

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

async function schedulePhaseNotification(batchId: string, batchName: string, fireDate: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Kombucha Ready!',
        body: `Your "${batchName}" is ready! Tap to add more time or complete.`,
        data: { batchId },
        sound: true,
      },
      trigger: fireDate > Date.now()
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireDate) }
        : null,
    });
    return notifId;
  } catch {
    return null;
  }
}

async function cancelNotification(notifId: string | null) {
  if (!notifId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {}
}

interface BatchContextValue {
  batches: Batch[];
  customTags: string[];
  allTags: string[];
  isLoading: boolean;
  createBatch: (name: string, tags: string[], note: string, durationDays: number) => Promise<string>;
  updateBatchName: (id: string, name: string) => void;
  updateBatchTags: (id: string, tags: string[]) => void;
  deleteBatch: (id: string) => void;
  addNote: (batchId: string, content: string, date: number) => void;
  updateNote: (batchId: string, entryId: string, content: string, date: number) => void;
  addPhoto: (batchId: string, imageUri: string, date: number) => void;
  updatePhotoDate: (batchId: string, entryId: string, date: number) => void;
  deleteEntry: (batchId: string, entryId: string) => void;
  updatePhaseName: (batchId: string, entryId: string, phaseName: string) => void;
  addPhase: (batchId: string, durationDays: number) => Promise<void>;
  completeBatch: (batchId: string, starRating: number | null) => void;
  addCustomTag: (tag: string) => void;
  updatePhaseTimer: (batchId: string, entryId: string, newDurationDays: number) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  getActivePhaseFn: (batch: Batch) => TimerLogEntry | null;
  getPhaseProgress: (entry: TimerLogEntry) => { elapsed: number; total: number; percent: number; dayStr: string };
}

const BatchContext = createContext<BatchContextValue | null>(null);

function computeCustomTagsInUse(batches: Batch[], customTags: string[]): string[] {
  const usedTags = new Set<string>();
  batches.forEach(b => b.tags.forEach(t => usedTags.add(t)));
  return customTags.filter(t => usedTags.has(t));
}

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [batchData, tagData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CUSTOM_TAGS_KEY),
        ]);
        if (batchData) setBatches(JSON.parse(batchData));
        if (tagData) setCustomTags(JSON.parse(tagData));
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const saveBatches = useCallback(async (newBatches: Batch[], newCustomTags?: string[]) => {
    setBatches(newBatches);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newBatches));
    if (newCustomTags !== undefined) {
      const cleaned = computeCustomTagsInUse(newBatches, newCustomTags);
      setCustomTags(cleaned);
      await AsyncStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(cleaned));
    }
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === 'granted') return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }, []);

  const createBatch = useCallback(async (name: string, tags: string[], note: string, durationDays: number): Promise<string> => {
    const id = genId();
    const now = Date.now();
    const startedAt = now;
    const fireDate = startedAt + durationDays * 24 * 60 * 60 * 1000;

    const notifId = await schedulePhaseNotification(id, name, fireDate);

    const timerEntry: TimerLogEntry = {
      id: genId(),
      type: 'timer_log',
      phase_name: 'Phase I',
      duration_days: durationDays,
      started_at: startedAt,
      ended_at: null,
      notification_id: notifId,
    };

    const timeline: TimelineEntry[] = [timerEntry];
    if (note.trim()) {
      const noteEntry: NoteEntry = {
        id: genId(),
        type: 'note',
        content: note.trim(),
        date: now,
      };
      timeline.push(noteEntry);
    }

    const batch: Batch = {
      id,
      name,
      tags,
      status: 'in_progress',
      star_rating: null,
      created_at: now,
      timeline,
    };

    const newBatches = [...batches, batch];
    await saveBatches(newBatches, customTags);
    return id;
  }, [batches, customTags, saveBatches]);

  const updateBatchName = useCallback((id: string, name: string) => {
    const newBatches = batches.map(b => b.id === id ? { ...b, name } : b);
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const updateBatchTags = useCallback((id: string, tags: string[]) => {
    const newBatches = batches.map(b => b.id === id ? { ...b, tags } : b);
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const deleteBatch = useCallback((id: string) => {
    const batch = batches.find(b => b.id === id);
    if (batch) {
      batch.timeline.forEach(e => {
        if (e.type === 'timer_log' && e.notification_id) {
          cancelNotification(e.notification_id);
        }
      });
    }
    const newBatches = batches.filter(b => b.id !== id);
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const addNote = useCallback((batchId: string, content: string, date: number) => {
    const entry: NoteEntry = { id: genId(), type: 'note', content, date };
    const newBatches = batches.map(b =>
      b.id === batchId ? { ...b, timeline: [...b.timeline, entry].sort((a, b) => a.date - b.date) } : b
    );
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const updateNote = useCallback((batchId: string, entryId: string, content: string, date: number) => {
    const newBatches = batches.map(b =>
      b.id === batchId ? {
        ...b,
        timeline: b.timeline.map(e =>
          e.id === entryId && e.type === 'note' ? { ...e, content, date } : e
        ).sort((a, b) => a.date - b.date)
      } : b
    );
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const addPhoto = useCallback((batchId: string, imageUri: string, date: number) => {
    const entry: PhotoEntry = { id: genId(), type: 'photo', image_data: imageUri, date };
    const newBatches = batches.map(b =>
      b.id === batchId ? { ...b, timeline: [...b.timeline, entry].sort((a, b) => a.date - b.date) } : b
    );
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const updatePhotoDate = useCallback((batchId: string, entryId: string, date: number) => {
    const newBatches = batches.map(b =>
      b.id === batchId ? {
        ...b,
        timeline: b.timeline.map(e =>
          e.id === entryId && e.type === 'photo' ? { ...e, date } : e
        ).sort((a, b) => a.date - b.date)
      } : b
    );
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const deleteEntry = useCallback((batchId: string, entryId: string) => {
    const newBatches = batches.map(b =>
      b.id === batchId ? { ...b, timeline: b.timeline.filter(e => e.id !== entryId) } : b
    );
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const updatePhaseName = useCallback((batchId: string, entryId: string, phaseName: string) => {
    const newBatches = batches.map(b =>
      b.id === batchId ? {
        ...b,
        timeline: b.timeline.map(e =>
          e.id === entryId && e.type === 'timer_log' ? { ...e, phase_name: phaseName } : e
        )
      } : b
    );
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const addPhase = useCallback(async (batchId: string, durationDays: number) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const phaseCount = batch.timeline.filter(e => e.type === 'timer_log').length;
    const phaseNames = ['Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase V'];
    const phaseName = phaseNames[phaseCount] || `Phase ${phaseCount + 1}`;

    const now = Date.now();
    const fireDate = now + durationDays * 24 * 60 * 60 * 1000;
    const notifId = await schedulePhaseNotification(batchId, batch.name, fireDate);

    const entry: TimerLogEntry = {
      id: genId(),
      type: 'timer_log',
      phase_name: phaseName,
      duration_days: durationDays,
      started_at: now,
      ended_at: null,
      notification_id: notifId,
    };

    const newBatches = batches.map(b =>
      b.id === batchId ? { ...b, timeline: [...b.timeline, entry] } : b
    );
    await saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const updatePhaseTimer = useCallback(async (batchId: string, entryId: string, newDurationDays: number) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    const entry = batch.timeline.find(e => e.id === entryId && e.type === 'timer_log') as TimerLogEntry | undefined;
    if (!entry) return;

    // Cancel old notification
    if (entry.notification_id) await cancelNotification(entry.notification_id);

    const fireDate = entry.started_at + newDurationDays * 24 * 60 * 60 * 1000;
    const notifId = await schedulePhaseNotification(batchId, batch.name, fireDate);

    const newBatches = batches.map(b =>
      b.id === batchId ? {
        ...b,
        timeline: b.timeline.map(e =>
          e.id === entryId && e.type === 'timer_log'
            ? { ...e, duration_days: newDurationDays, notification_id: notifId }
            : e
        ),
      } : b
    );
    await saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const completeBatch = useCallback((batchId: string, starRating: number | null) => {
    const now = Date.now();
    const newBatches = batches.map(b => {
      if (b.id !== batchId) return b;
      const newTimeline = b.timeline.map(e => {
        if (e.type === 'timer_log' && e.ended_at === null) {
          if (e.notification_id) cancelNotification(e.notification_id);
          return { ...e, ended_at: now };
        }
        return e;
      });
      return { ...b, status: 'completed' as const, star_rating: starRating, timeline: newTimeline };
    });
    saveBatches(newBatches, customTags);
  }, [batches, customTags, saveBatches]);

  const addCustomTag = useCallback((tag: string) => {
    if (DEFAULT_TAGS.includes(tag) || customTags.includes(tag)) return;
    const newCustomTags = [...customTags, tag];
    setCustomTags(newCustomTags);
    AsyncStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(newCustomTags));
  }, [customTags]);

  const getActivePhaseFn = useCallback((batch: Batch): TimerLogEntry | null => {
    const phases = batch.timeline.filter(e => e.type === 'timer_log') as TimerLogEntry[];
    return phases.find(p => p.ended_at === null) ?? null;
  }, []);

  const getPhaseProgress = useCallback((entry: TimerLogEntry) => {
    const now = Date.now();
    const totalMs = entry.duration_days * 24 * 60 * 60 * 1000;
    const elapsedMs = Math.min(now - entry.started_at, totalMs);
    const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
    const totalDays = entry.duration_days;
    const percent = Math.min(elapsedMs / totalMs, 1);

    let dayStr: string;
    if (totalDays < 1) {
      const elapsedHours = elapsedMs / 3600000;
      const totalHours = totalMs / 3600000;
      if (totalHours < 1) {
        const elapsedMins = elapsedMs / 60000;
        const totalMins = totalMs / 60000;
        dayStr = `${Math.floor(elapsedMins)}m of ${Math.round(totalMins)}m`;
      } else {
        dayStr = `${elapsedHours.toFixed(1)}h of ${totalHours.toFixed(1)}h`;
      }
    } else {
      dayStr = `Day ${Math.floor(elapsedDays) + 1} of ${totalDays}`;
    }

    return { elapsed: elapsedDays, total: totalDays, percent, dayStr };
  }, []);

  const allTags = useMemo(() => {
    const combined = [...DEFAULT_TAGS];
    customTags.forEach(t => { if (!combined.includes(t)) combined.push(t); });
    return combined;
  }, [customTags]);

  const value = useMemo<BatchContextValue>(() => ({
    batches,
    customTags,
    allTags,
    isLoading,
    createBatch,
    updateBatchName,
    updateBatchTags,
    deleteBatch,
    addNote,
    updateNote,
    addPhoto,
    updatePhotoDate,
    deleteEntry,
    updatePhaseName,
    addPhase,
    completeBatch,
    addCustomTag,
    updatePhaseTimer,
    requestNotificationPermission,
    getActivePhaseFn,
    getPhaseProgress,
  }), [batches, customTags, allTags, isLoading, createBatch, updateBatchName, updateBatchTags, deleteBatch, addNote, updateNote, addPhoto, updatePhotoDate, deleteEntry, updatePhaseName, addPhase, completeBatch, addCustomTag, updatePhaseTimer, requestNotificationPermission, getActivePhaseFn, getPhaseProgress]);

  return <BatchContext.Provider value={value}>{children}</BatchContext.Provider>;
}

export function useBatches() {
  const ctx = useContext(BatchContext);
  if (!ctx) throw new Error('useBatches must be used within BatchProvider');
  return ctx;
}
