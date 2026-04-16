import type {
  BlendDetail,
  CreateBlendPayload,
  CreateBlendResponse,
  PlaylistFetchResponse,
} from "@/types/blend";

function resolveApiBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  return trimmedBaseUrl.endsWith("/api") ? trimmedBaseUrl.slice(0, -4) : trimmedBaseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("merge_session_token") : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail ?? "Something went wrong while talking to the API.";
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Blend
// ---------------------------------------------------------------------------

export async function createBlend(payload: CreateBlendPayload): Promise<CreateBlendResponse> {
  return request<CreateBlendResponse>("/blend/create", {
    method: "POST",
    body: JSON.stringify({
      user_a: {
        name: payload.userA.name,
        playlist_links: payload.userA.playlistLinks.filter(Boolean),
        include_liked_songs: payload.userA.includeLikedSongs,
      },
      user_b: {
        name: payload.userB.name,
        playlist_links: payload.userB.playlistLinks.filter(Boolean),
        include_liked_songs: payload.userB.includeLikedSongs,
      },
      creator_id: payload.creatorId,
    }),
  });
}

export async function fetchPlaylistSources(blendId: string, sync = true): Promise<PlaylistFetchResponse> {
  return request<PlaylistFetchResponse>("/playlist/fetch", {
    method: "POST",
    body: JSON.stringify({ blendId, sync }),
  });
}

export async function generateBlend(blendId: string): Promise<BlendDetail> {
  return request<BlendDetail>("/blend/generate", {
    method: "POST",
    body: JSON.stringify({ blendId }),
  });
}

export async function generateBlendAsync(blendId: string): Promise<{ blendId: string; taskId?: string; jobId?: string; status: string }> {
  return request("/blend/generate/async", {
    method: "POST",
    body: JSON.stringify({ blendId }),
  });
}

export async function getBlend(blendId: string): Promise<BlendDetail> {
  return request<BlendDetail>(`/blend/${blendId}`);
}

export function getBlendShareUrl(blendId: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/blend/${blendId}`;
}

export async function getJobStatus(jobId: string): Promise<{
  jobId: string;
  jobType: string;
  status: string;
  progress: number;
  blendId: string;
  errorMessage?: string | null;
}> {
  return request(`/job/${jobId}`);
}

// ---------------------------------------------------------------------------
// YouTube Music OAuth
// ---------------------------------------------------------------------------

export async function getYouTubeAuthUrl(): Promise<{ url: string }> {
  return request<{ url: string }>("/auth/youtube/url");
}

export async function getYouTubeStatus(): Promise<{ connected: boolean; method: "oauth" | null }> {
  return request("/user/youtube-status");
}

export async function getUserPlaylists(): Promise<Array<{ id: string; title: string; count: number; thumbnail: string }>> {
  return request("/user/playlists");
}

export async function getLikedSongsCount(): Promise<{ count: number }> {
  return request("/user/liked-songs/count");
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function createYTMusicPlaylist(payload: {
  blendId: string;
  userId: string;
  title: string;
  description?: string;
}): Promise<{ blendId: string; playlistId: string; status: string }> {
  return request<{ blendId: string; playlistId: string; status: string }>("/ytmusic/create-playlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function submitTrackFeedback(payload: {
  blendId: string;
  trackId: string;
  action: "like" | "dislike" | "skip";
}): Promise<{ status: string }> {
  return request<{ status: string }>("/feedback/track", {
    method: "POST",
    body: JSON.stringify({
      blend_id: payload.blendId,
      track_id: payload.trackId,
      action: payload.action,
    }),
  });
}

export async function submitBlendFeedback(payload: {
  blendId: string;
  rating: number | null;
  quickOption: "accurate" | "missed_vibe" | null;
}): Promise<{ status: string }> {
  return request<{ status: string }>("/feedback/blend", {
    method: "POST",
    body: JSON.stringify({
      blend_id: payload.blendId,
      rating: payload.rating,
      quick_option: payload.quickOption,
    }),
  });
}

// --- Invite Flow ---

export async function createInvite(payload: { playlistUrls: string[], includeLikedSongs: boolean }) {
  return request<{ code: string; expiresAt: string; shareUrl: string }>("/invite/create", {
    method: "POST",
    body: JSON.stringify({
      playlist_urls: payload.playlistUrls,
      include_liked_songs: payload.includeLikedSongs,
    }),
  });
}

export async function getInvite(code: string) {
  return request<{ creatorName: string; status: string; blendId: string | null }>(`/invite/${code}`);
}

export async function joinInvite(code: string, payload: { playlistUrls: string[], includeLikedSongs: boolean }) {
  return request<{ blendId: string }>(`/invite/${code}/join`, {
    method: "POST",
    body: JSON.stringify({
      playlist_urls: payload.playlistUrls,
      include_liked_songs: payload.includeLikedSongs,
    }),
  });
}
