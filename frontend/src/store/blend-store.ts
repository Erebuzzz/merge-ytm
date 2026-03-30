import { create } from "zustand";

import type { BlendDetail, CreateBlendPayload, ParticipantDraft } from "@/types/blend";

type ParticipantKey = "userA" | "userB";

export type TrackAction = "like" | "dislike" | "skip";

type BlendStore = {
  draft: CreateBlendPayload;
  result: BlendDetail | null;
  isSubmitting: boolean;
  error: string | null;
  trackFeedback: Record<string, TrackAction | null>;
  blendRating: number | null;
  blendQuickOption: "accurate" | "missed_vibe" | null;
  hasSubmittedFeedback: boolean;
  setParticipantName: (key: ParticipantKey, name: string) => void;
  setPlaylistLink: (key: ParticipantKey, index: number, value: string) => void;
  addPlaylistLink: (key: ParticipantKey) => void;
  removePlaylistLink: (key: ParticipantKey, index: number) => void;
  setIncludeLikedSongs: (key: ParticipantKey, enabled: boolean) => void;
  setResult: (result: BlendDetail | null) => void;
  setSubmitting: (value: boolean) => void;
  setError: (value: string | null) => void;
  setTrackFeedback: (trackId: string, action: TrackAction | null) => void;
  setBlendRating: (rating: number | null) => void;
  setBlendQuickOption: (option: "accurate" | "missed_vibe" | null) => void;
  setHasSubmittedFeedback: (value: boolean) => void;
  reset: () => void;
};

const createParticipant = (): ParticipantDraft => ({
  name: "",
  playlistLinks: [""],
  includeLikedSongs: false,
});

const createDraft = (): CreateBlendPayload => ({
  userA: createParticipant(),
  userB: createParticipant(),
});

export const useBlendStore = create<BlendStore>((set) => ({
  draft: createDraft(),
  result: null,
  isSubmitting: false,
  error: null,
  trackFeedback: {},
  blendRating: null,
  blendQuickOption: null,
  hasSubmittedFeedback: false,
  setParticipantName: (key, name) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [key]: {
          ...state.draft[key],
          name,
        },
      },
    })),
  setPlaylistLink: (key, index, value) =>
    set((state) => {
      const nextLinks = [...state.draft[key].playlistLinks];
      nextLinks[index] = value;
      return {
        draft: {
          ...state.draft,
          [key]: {
            ...state.draft[key],
            playlistLinks: nextLinks,
          },
        },
      };
    }),
  addPlaylistLink: (key) =>
    set((state) => {
      if (state.draft[key].playlistLinks.length >= 5) {
        return state;
      }
      return {
        draft: {
          ...state.draft,
          [key]: {
            ...state.draft[key],
            playlistLinks: [...state.draft[key].playlistLinks, ""],
          },
        },
      };
    }),
  removePlaylistLink: (key, index) =>
    set((state) => {
      const nextLinks = state.draft[key].playlistLinks.filter((_, currentIndex) => currentIndex !== index);
      return {
        draft: {
          ...state.draft,
          [key]: {
            ...state.draft[key],
            playlistLinks: nextLinks.length ? nextLinks : [""],
          },
        },
      };
    }),
  setIncludeLikedSongs: (key, enabled) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [key]: {
          ...state.draft[key],
          includeLikedSongs: enabled,
        },
      },
    })),
  setResult: (result) => set({ result }),
  setSubmitting: (value) => set({ isSubmitting: value }),
  setError: (value) => set({ error: value }),
  setTrackFeedback: (trackId, action) =>
    set((state) => ({
      trackFeedback: { ...state.trackFeedback, [trackId]: action },
    })),
  setBlendRating: (rating) => set({ blendRating: rating }),
  setBlendQuickOption: (option) => set({ blendQuickOption: option }),
  setHasSubmittedFeedback: (value) => set({ hasSubmittedFeedback: value }),
  reset: () => set({ draft: createDraft(), result: null, isSubmitting: false, error: null, trackFeedback: {}, blendRating: null, blendQuickOption: null, hasSubmittedFeedback: false }),
}));
