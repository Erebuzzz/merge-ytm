export type Track = {
  title: string;
  artist: string;
  videoId?: string | null;
  normalizedKey?: string | null;
  source?: string | null;
  score?: number | null;
  metadata?: Record<string, unknown>;
};

export type BlendSection = {
  title: string;
  description: string;
  tracks: Track[];
};

export type BlendParticipant = {
  userId: string;
  name: string;
  sourceCount: number;
  hasAuth: boolean;
};

export type BlendDetail = {
  id: string;
  status: string;
  compatibilityScore: number;
  sections: BlendSection[];
  participants: {
    userA: BlendParticipant;
    userB: BlendParticipant;
  };
  youtubePlaylistId?: string | null;
  diagnostics: Record<string, unknown>;
};

export type ParticipantDraft = {
  name: string;
  playlistLinks: string[];
  includeLikedSongs: boolean;
};

export type CreateBlendPayload = {
  userA: ParticipantDraft;
  userB: ParticipantDraft;
};

export type CreateBlendResponse = {
  blendId: string;
  userIds: {
    userA: string;
    userB: string;
  };
  status: string;
};

export type PlaylistFetchResponse = {
  blendId: string;
  status: string;
  sources: Array<{
    userId: string;
    sourceType: string;
    sourceValue: string;
    trackCount: number;
    status: string;
    failureReason?: string | null;
  }>;
  taskId?: string | null;
};
