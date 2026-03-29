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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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
    body: JSON.stringify({
      blendId,
      sync,
    }),
  });
}

export async function generateBlend(blendId: string): Promise<BlendDetail> {
  return request<BlendDetail>("/blend/generate", {
    method: "POST",
    body: JSON.stringify({ blendId }),
  });
}

export async function getBlend(blendId: string): Promise<BlendDetail> {
  return request<BlendDetail>(`/blend/${blendId}`);
}

export async function uploadAuth(userId: string, file: File): Promise<{ userId: string; status: string }> {
  const formData = new FormData();
  formData.append("user_id", userId);
  formData.append("headers_file", file);
  return request<{ userId: string; status: string }>("/user/upload-auth", {
    method: "POST",
    body: formData,
  });
}

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
