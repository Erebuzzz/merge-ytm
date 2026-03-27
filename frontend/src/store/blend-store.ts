import { create } from "zustand";

import type { BlendDetail, CreateBlendPayload, ParticipantDraft } from "@/types/blend";

type ParticipantKey = "userA" | "userB";

type BlendStore = {
  draft: CreateBlendPayload;
  result: BlendDetail | null;
  isSubmitting: boolean;
  error: string | null;
  setParticipantName: (key: ParticipantKey, name: string) => void;
  setPlaylistLink: (key: ParticipantKey, index: number, value: string) => void;
  addPlaylistLink: (key: ParticipantKey) => void;
  removePlaylistLink: (key: ParticipantKey, index: number) => void;
  setIncludeLikedSongs: (key: ParticipantKey, enabled: boolean) => void;
  setResult: (result: BlendDetail | null) => void;
  setSubmitting: (value: boolean) => void;
  setError: (value: string | null) => void;
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
  reset: () => set({ draft: createDraft(), result: null, isSubmitting: false, error: null }),
}));
