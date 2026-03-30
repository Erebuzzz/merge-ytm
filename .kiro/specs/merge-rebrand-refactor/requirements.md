# Requirements Document

## Introduction

This spec covers the full rebrand and refactor of the existing "YTMusic Sync" application to "Merge". The rebrand is not cosmetic only — it reflects a repositioning of the product from a private sync tool to a community-first, publicly released playlist generation platform. The refactor aligns the codebase, branding, copy, data models, API surface, and UX with the new product identity.

Merge generates playlists by analyzing the combined listening preferences of multiple users. It focuses on taste compatibility and discovery rather than simple overlap. The app is free, community-driven, and built on accessible open-source tooling.

## Glossary

- **Merge**: The new product name, replacing "YTMusic Sync".
- **Blend**: A generated playlist result produced from two users' combined music taste.
- **Blend_Engine**: The backend service that computes shared tracks, recommendations, and compatibility scores.
- **YTMusicService**: The backend wrapper around `ytmusicapi` responsible for safe API calls, retries, validation, and logging.
- **Normalization_Service**: The backend service that normalizes and deduplicates track metadata.
- **Job**: An async task record tracking the status and progress of a long-running operation (fetch, generate, export).
- **Feedback_Service**: The backend service that collects, stores, and aggregates user feedback on blends and tracks.
- **User**: An authenticated account holder in the system.
- **Track**: A music item with title, artist, videoId, and a normalized key used for matching.
- **Compatibility_Score**: A float value (0–100) representing how much two users' libraries overlap.
- **PlaylistSource**: A user-submitted playlist link or auth-based source used as input to a Blend.
- **Export_Pipeline**: The sequence of steps that creates a YouTube Music playlist and adds matched tracks to it.
- **Rate_Limiter**: The middleware component that enforces per-user and per-IP request limits.
- **Auth_Provider**: The third-party authentication service (Firebase Auth or Clerk) used for user identity.

---

## Requirements

### Requirement 1: Application Rebrand

**User Story:** As a user, I want the application to be named and presented as "Merge", so that the product identity is consistent across all surfaces.

#### Acceptance Criteria

1. THE Merge application SHALL display the name "Merge" in all UI surfaces, including the page title, sidebar, navigation, and metadata.
2. THE Merge application SHALL display the tagline "Create playlists from your combined music taste on YouTube Music" in the landing page hero section.
3. THE Merge application SHALL replace all occurrences of "YTMusic Sync" in source code, configuration files, package manifests, documentation, and UI copy with "Merge" or "merge" as appropriate to context.
4. THE Merge application SHALL update the `<Metadata>` title in `layout.tsx` to "Merge".
5. THE Merge application SHALL update the backend `app_name` setting to "Merge".
6. THE Merge application SHALL update the Python package name in `pyproject.toml` from `ytmusic-sync-backend` (or equivalent) to `merge-backend`.
7. THE Merge application SHALL update all GitHub repository references in UI copy and documentation from the old repo slug to the new "Merge" repo slug.

---

### Requirement 2: Landing Page Refactor

**User Story:** As a visitor, I want the landing page to communicate Merge's value proposition clearly, so that I understand what the product does and how to get started.

#### Acceptance Criteria

1. THE Merge application SHALL display the primary hero headline: "Combine your music taste with friends and generate playlists that actually fit both of you".
2. THE Merge application SHALL display the secondary hero message: "Not just shared songs. Merge builds playlists from your combined taste."
3. THE Merge application SHALL present a primary call-to-action labelled "Create Merge" that navigates to the blend creation flow.
4. THE Merge application SHALL present a secondary call-to-action labelled "Login" that navigates to the authentication flow.
5. THE Merge application SHALL remove all references to "YTMusic Sync" branding, Spotify brand colors (`brand-spotify`), and Spotify-specific copy from the landing page.
6. THE Merge application SHALL present the three UX flow steps — paste playlist links, generate blend, export to YouTube Music — as feature highlights on the landing page.
7. WHERE the community model is enabled, THE Merge application SHALL display a community message stating that Merge is free, independent, and community-driven.

---

### Requirement 3: Authentication

**User Story:** As a user, I want to log in securely, so that my data and blends are protected.

#### Acceptance Criteria

1. THE Auth_Provider SHALL require login before a user can create or view a Blend.
2. THE Auth_Provider SHALL maintain session-based access so that authenticated state persists across page navigations.
3. WHEN a user attempts to access a protected route without a valid session, THE Merge application SHALL redirect the user to the login page.
4. THE Merge application SHALL enforce authentication on all backend API routes.
5. IF an authentication token is invalid or expired, THEN THE Auth_Provider SHALL return an unauthorized error response and THE Merge application SHALL redirect the user to the login page.

---

### Requirement 4: Input — Playlist Links

**User Story:** As a user, I want to paste playlist links to represent my music taste, so that I can participate in a Blend without technical setup.

#### Acceptance Criteria

1. THE Merge application SHALL accept up to 5 playlist links per user as input for a Blend.
2. WHEN a user submits a playlist link, THE Merge application SHALL validate that the link is a recognizable YouTube Music playlist URL before accepting it.
3. IF a user submits more than 5 playlist links, THEN THE Merge application SHALL reject the excess links and display an error message indicating the limit.
4. IF a submitted playlist link fails validation, THEN THE Merge application SHALL display a descriptive error message identifying which link is invalid.

---

### Requirement 5: Input — Advanced Auth Upload

**User Story:** As a power user, I want to optionally upload my YouTube Music auth headers, so that I can import liked songs and enable playlist export.

#### Acceptance Criteria

1. WHERE the advanced auth upload feature is enabled, THE Merge application SHALL display an explicit warning to the user before accepting an auth headers file.
2. WHEN an auth headers file is uploaded, THE Merge application SHALL encrypt the file contents before storing them.
3. WHEN an auth headers file is uploaded, THE Merge application SHALL use the credentials only for the duration of the active operation and not persist them in plaintext.
4. THE Merge application SHALL validate the uploaded file size and reject files that exceed the configured maximum upload size.
5. IF an auth headers file fails validation, THEN THE Merge application SHALL return a descriptive error message.

---

### Requirement 6: Data Collection

**User Story:** As a user, I want the system to fetch my playlist tracks reliably, so that my Blend is based on accurate data.

#### Acceptance Criteria

1. WHEN a playlist fetch is initiated, THE YTMusicService SHALL retrieve tracks using `ytmusicapi.get_playlist` with pagination support.
2. WHEN a liked songs fetch is initiated, THE YTMusicService SHALL retrieve up to 5000 liked songs using `ytmusicapi.get_liked_songs`.
3. THE YTMusicService SHALL require each fetched track to have a `videoId`, `title`, and `artist` field; tracks missing any of these fields SHALL be skipped.
4. WHEN a fetch operation fails, THE YTMusicService SHALL retry the operation up to 3 times using exponential backoff before marking the Job as failed.
5. THE YTMusicService SHALL record fetch success rate and missing metadata ratio as telemetry metrics.
6. WHEN a fetch completes, THE Merge application SHALL report data quality metrics including total tracks fetched, valid tracks, and skipped tracks.

---

### Requirement 7: Track Normalization and Deduplication

**User Story:** As a user, I want the system to accurately match tracks across different playlist sources, so that my Blend reflects my true taste overlap.

#### Acceptance Criteria

1. THE Normalization_Service SHALL apply NFKD unicode normalization to all track titles and artist names before comparison.
2. THE Normalization_Service SHALL convert all track titles and artist names to lowercase before comparison.
3. THE Normalization_Service SHALL remove bracket noise (e.g. "Official Video", "Audio", "Lyrics", "Remastered") from track titles before comparison.
4. THE Normalization_Service SHALL normalize featuring credits and special symbols in track titles before comparison.
5. THE Normalization_Service SHALL trim leading and trailing whitespace from all normalized fields.
6. WHEN two tracks share the same artist and have a normalized title similarity score of 80 or above, THE Normalization_Service SHALL treat them as duplicates.
7. WHEN two tracks have different artists and have a normalized title similarity score of 90 or above, THE Normalization_Service SHALL treat them as duplicates.
8. THE Normalization_Service SHALL store the normalized key as an indexed field on the Track record to support efficient lookup.
9. WHERE a caching layer is available, THE Normalization_Service SHALL cache normalized track records to avoid redundant computation.

---

### Requirement 8: Blend Engine

**User Story:** As a user, I want the Blend to reflect both shared taste and compatible discoveries, so that the result feels relevant to both participants.

#### Acceptance Criteria

1. WHEN a Blend is generated, THE Blend_Engine SHALL compute the intersection of User A's and User B's normalized track sets as the "You both love" section.
2. WHEN a Blend is generated, THE Blend_Engine SHALL compute tracks exclusive to User A and rank them by compatibility score as the "You might like" section.
3. WHEN a Blend is generated, THE Blend_Engine SHALL compute tracks exclusive to User B and rank them by compatibility score as the "From your friend" section.
4. THE Blend_Engine SHALL score each recommendation track using the formula: `score = (0.5 * overlap_ratio) + (0.3 * artist_similarity) + (0.2 * diversity_factor) + frequency_weight`.
5. THE Blend_Engine SHALL compute the Compatibility_Score using the formula: `2 * common_tracks / (len(A) + len(B))`, expressed as a percentage.
6. THE Blend_Engine SHALL limit the total tracks in a generated Blend to 50.
7. THE Blend_Engine SHALL limit each section to a maximum of 20 tracks.
8. THE Blend_Engine SHALL apply frequency weighting so that tracks a user has in multiple playlists are ranked higher.
9. WHEN a user's feedback history is available, THE Blend_Engine SHALL boost tracks with a high like ratio and penalize tracks with a high skip rate.

---

### Requirement 9: Playlist Export

**User Story:** As a user, I want to export my Blend as a YouTube Music playlist, so that I can listen to it directly.

#### Acceptance Criteria

1. WHEN a user initiates an export, THE Export_Pipeline SHALL create a new private playlist on YouTube Music using the authenticated user's credentials.
2. FOR EACH track in the Blend, THE Export_Pipeline SHALL search YouTube Music for the best matching video by title and artist.
3. WHEN a match is found, THE Export_Pipeline SHALL validate that the matched video's artist and title are consistent with the source track before adding it to the playlist.
4. IF a track cannot be matched or validated, THEN THE Export_Pipeline SHALL skip that track and log the failure without aborting the export.
5. WHEN an export completes, THE Merge application SHALL return the YouTube Music playlist URL to the user.
6. THE Export_Pipeline SHALL log all export failures including incorrect track versions, missing metadata, and partial failures.

---

### Requirement 10: Async Job Processing

**User Story:** As a user, I want long-running operations to run in the background, so that the UI remains responsive during fetch and generation.

#### Acceptance Criteria

1. THE Merge application SHALL process playlist fetch, blend generation, and playlist export as asynchronous background Jobs.
2. WHEN a Job is created, THE Merge application SHALL assign it a unique `job_id` and set its initial status to `pending`.
3. WHILE a Job is running, THE Merge application SHALL update the Job status to `running` and track a `progress` value.
4. WHEN a Job completes successfully, THE Merge application SHALL set the Job status to `done`.
5. IF a Job fails, THEN THE Merge application SHALL set the Job status to `failed` and record an `error_message`.
6. WHEN a client polls for Job status, THE Merge application SHALL return the current `status`, `progress`, and `error_message` fields.

---

### Requirement 11: Feedback System

**User Story:** As a user, I want to give feedback on tracks and blends, so that future recommendations improve over time.

#### Acceptance Criteria

1. THE Merge application SHALL allow a user to submit a like, dislike, or skip action on any individual track in a Blend result.
2. THE Merge application SHALL allow a user to submit a 1–5 star rating on a completed Blend.
3. THE Merge application SHALL allow a user to submit a quick feedback option ("Felt accurate" or "Missed the vibe") on a completed Blend.
4. WHEN a user submits track-level feedback, THE Feedback_Service SHALL store the action with the associated `user_id`, `blend_id`, `track_id`, and `created_at` timestamp.
5. WHEN a user submits blend-level feedback, THE Feedback_Service SHALL store the rating with the associated `user_id` and `blend_id`.
6. THE Merge application SHALL display track-level feedback controls (👍 👎 ⏭) inline with each track, visible on hover or tap.
7. THE Merge application SHALL provide instant visual feedback and a subtle animation when a feedback action is selected.
8. THE Merge application SHALL allow feedback actions to be toggled (selecting the same action again removes it).
9. THE Merge application SHALL present blend-level feedback after the user has viewed the playlist, after export, or after the first full scroll — whichever occurs first.
10. THE Merge application SHALL make all feedback inputs optional and dismissible without blocking the user's workflow.
11. WHEN a user has submitted no feedback, THE Merge application SHALL display the hint: "Give a quick 👍 or 👎 to help improve recommendations".
12. THE Feedback_Service SHALL asynchronously compute like ratio per track, skip rate, and user preference profiles after feedback is submitted.
13. THE Feedback_Service SHALL track average blend rating, track like ratio, skip rate, and feedback coverage as observability metrics.

---

### Requirement 12: Security

**User Story:** As a user, I want my data to be handled securely, so that my credentials and listening history are protected.

#### Acceptance Criteria

1. THE Merge application SHALL enforce authentication on all API routes; unauthenticated requests SHALL receive a 401 response.
2. THE Merge application SHALL encrypt all sensitive user data (auth headers) before storage.
3. THE Merge application SHALL restrict CORS in production to the configured frontend origin only.
4. THE Merge application SHALL validate upload file size and reject requests that exceed the configured limit.
5. THE Merge application SHALL enforce ownership checks so that a user cannot access or modify another user's Blend or PlaylistSource.
6. THE Rate_Limiter SHALL reject requests from a single user that exceed 60 requests per minute with a 429 response.
7. THE Rate_Limiter SHALL reject requests from a single IP address that exceed 100 requests per minute with a 429 response.

---

### Requirement 13: Observability and Logging

**User Story:** As a developer, I want the system to log errors and track key metrics, so that I can monitor health and diagnose failures.

#### Acceptance Criteria

1. THE Merge application SHALL log all API errors, YTMusic API failures, and export failures.
2. THE Merge application SHALL track fetch success rate, export accuracy, and job failure rate as operational metrics.
3. THE Merge application SHALL track average blend rating, track like ratio, skip rate, and feedback coverage as product metrics.

---

### Requirement 14: Sponsorship Display

**User Story:** As a community member, I want to see sponsorship acknowledgements in appropriate places, so that I understand how the project is supported.

#### Acceptance Criteria

1. WHERE sponsorship is enabled, THE Merge application SHALL display sponsorship acknowledgement in the footer.
2. WHERE sponsorship is enabled, THE Merge application SHALL display sponsorship acknowledgement on the About page.

---

### Requirement 15: Deployment Configuration

**User Story:** As a developer, I want the deployment configuration to reflect the new product name, so that infrastructure and environment variables are consistent.

#### Acceptance Criteria

1. THE Merge application SHALL define the following required environment variables: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `NEXT_PUBLIC_API_BASE_URL`, and `FRONTEND_URL`.
2. THE Merge application SHALL deploy the frontend to Vercel.
3. THE Merge application SHALL deploy the backend to Railway or Render.
4. THE Merge application SHALL use Neon or Supabase as the PostgreSQL database provider.
5. THE Merge application SHALL update all deployment documentation to reference "Merge" instead of "YTMusic Sync".
