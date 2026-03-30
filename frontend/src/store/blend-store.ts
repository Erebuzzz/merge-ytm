import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

const initialFeedbackState = {
  trackFeedback: {} as Record<string, TrackAction | null>,
  blendRating: null as number | null,
  blendQuickOption: null as "accurate" | "missed_vibe" | null,
  hasSubmittedFeedback: false,
};

export const useBlendStore = create<BlendStore>()(
  persist<BlendStore>(
    (set) => ({
      draft: createDraft(),
      result: null,
      isSubmitting: false,
      error: null,
      ...initialFeedbackState,

      setParticipantName: (key: ParticipantKey, name: string) =>
        set((state) => ({
          draft: { ...state.draft, [key]: { ...state.draft[key], name } },
        })),

      setPlaylistLink: (key: ParticipantKey, index: number, value: string) =>
        set((state) => {
          const nextLinks = [...state.draft[key].playlistLinks];
          nextLinks[index] = value;
          return { draft: { ...state.draft, [key]: { ...state.draft[key], playlistLinks: nextLinks } } };
        }),

      addPlaylistLink: (key: ParticipantKey) =>
        set((state) => {
          if (state.draft[key].playlistLinks.length >= 5) return state;
          return {
            draft: {
              ...state.draft,
              [key]: { ...state.draft[key], playlistLinks: [...state.draft[key].playlistLinks, ""] },
            },
          };
        }),

      removePlaylistLink: (key: ParticipantKey, index: number) =>
        set((state) => {
          const nextLinks = state.draft[key].playlistLinks.filter((_: string, i: number) => i !== index);
          return {
            draft: {
              ...state.draft,
              [key]: { ...state.draft[key], playlistLinks: nextLinks.length ? nextLinks : [""] },
            },
          };
        }),

      setIncludeLikedSongs: (key: ParticipantKey, enabled: boolean) =>
        set((state) => ({
          draft: { ...state.draft, [key]: { ...state.draft[key], includeLikedSongs: enabled } },
        })),

      setResult: (result: BlendDetail | null) => set({ result }),
      setSubmitting: (value: boolean) => set({ isSubmitting: value }),
      setError: (value: string | null) => set({ error: value }),

      setTrackFeedback: (trackId: string, action: TrackAction | null) =>
        set((state) => ({ trackFeedback: { ...state.trackFeedback, [trackId]: action } })),

      setBlendRating: (rating: number | null) => set({ blendRating: rating }),
      setBlendQuickOption: (option: "accurate" | "missed_vibe" | null) => set({ blendQuickOption: option }),
      setHasSubmittedFeedback: (value: boolean) => set({ hasSubmittedFeedback: value }),

      reset: () =>
        set({
          draft: createDraft(),
          result: null,
          isSubmitting: false,
          error: null,
          ...initialFeedbackState,
        }),
    }),
    {
      name: "merge-blend-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist feedback — draft and submission state are session-only
      partialize: (state) => ({
        trackFeedback: state.trackFeedback,
        blendRating: state.blendRating,
        blendQuickOption: state.blendQuickOption,
        hasSubmittedFeedback: state.hasSubmittedFeedback,
      }) as BlendStore,
    },
  ),
);
