# Kombucha Batch Tracker

A polished iOS mobile app for tracking homemade kombucha batches through fermentation phases.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js server (serves landing page and API routes)
- **Storage**: AsyncStorage (local device storage, no accounts)
- **Notifications**: expo-notifications (local push notifications)

## Key Features

- Active Batches tab: track in-progress batches with fermentation progress
- Completed Batches tab: review finished batches with star ratings
- Batch creation: name, tags, optional note, adjustable timer duration
- Batch Detail: circular progress ring, editable name/tags, chronological timeline
- Timeline entries: notes (editable), photos (camera/library), timer phase logs
- Timer system: phase-based (Phase I → II → III), calculated from start date
- Phase completion flow: Add More Time or Complete with star rating
- Local push notifications when a phase timer completes
- Tag system: default tags + custom tags (auto-cleanup when unused)

## File Structure

```
app/
  _layout.tsx          - Root layout with providers
  (tabs)/
    _layout.tsx        - NativeTabs (liquid glass iOS 26+) with 2 tabs
    index.tsx          - Active Batches screen
    completed.tsx      - Completed Batches screen
  batch/
    [id].tsx           - Batch Detail screen
  new-batch.tsx        - New Batch creation modal
context/
  BatchContext.tsx     - Main state management (AsyncStorage)
components/
  CircularProgress.tsx - SVG circular progress ring
  TagChip.tsx          - Tappable tag pill component
  StarRating.tsx       - 1-5 star rating component
  TimelineEntryCard.tsx - Note/Photo/Timer timeline entry cards
constants/
  colors.ts            - Warm earthy color palette (terracotta, sage, warm cream)
```

## Design

- Warm earthy palette: terracotta accent (#C4622D), sage green (#7A9E7E), warm off-white (#FAF8F5)
- Inter font family (400, 500, 600, 700)
- NativeTabs with liquid glass support on iOS 26+
- Material-inspired clean cards with subtle shadows

## Tech Stack

- expo-router v5
- expo-notifications (local push)
- expo-image-picker (camera + library)
- @react-native-async-storage/async-storage
- react-native-svg (circular progress)
- expo-haptics (touch feedback)
