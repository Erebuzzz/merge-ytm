import { SectionCard } from "@/components/ui/section-card";

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-10">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-brand-ytgradient1 to-brand-ytmusic pb-2">
          Documentation & FAQ
        </h1>
        <p className="text-text-secondary mt-2 text-lg">Everything you need to know about Merge.</p>
      </div>

      <SectionCard eyebrow="Guide" title="How to Create a Blend">
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <p>Creating a blend takes less than a minute. Here are the steps:</p>
          <div className="space-y-4">
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-2">1. Paste Playlist Links</h3>
              <p>Go to the <strong>Create Blend</strong> page. You and your friend each paste up to 5 YouTube Music playlist URLs. Merge extracts the tracks to understand your combined taste.</p>
            </div>
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-2">2. Upload Auth (Optional)</h3>
              <p>To include your <em>Liked Songs</em> or to <em>export the final playlist</em> to your YouTube Music library, upload your <code>headers_auth.json</code> file on the <strong>Auth Upload</strong> page. Skip this step if you only want to use public playlists and preview the result in the browser.</p>
            </div>
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-2">3. Generate & Export</h3>
              <p>Click <strong>Generate Blend</strong>. Merge analyzes your input, finds the overlap, scores compatibility, and builds a balanced playlist. Click <strong>Sync to YT Music</strong> to push it straight to your library.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Under the Hood" title="How the Algorithm Works">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>Merge builds a playlist in four sections:</p>
          <ul className="list-disc pl-5 space-y-3 marker:text-brand-ytmusic">
            <li>
              <strong className="text-white">Shared Taste</strong> — tracks that appear in both libraries after normalization and fuzzy matching. These anchor the playlist.
            </li>
            <li>
              <strong className="text-white">From User A / From User B</strong> — unique tracks from each listener, ranked by a scoring formula that weighs overlap ratio, artist similarity, and diversity. Tracks a user has across multiple playlists rank higher.
            </li>
            <li>
              <strong className="text-white">New Discoveries</strong> — algorithmic radio picks seeded from your shared tracks, filtered to exclude anything either listener already knows.
            </li>
          </ul>
          <p className="text-xs text-text-muted pt-2">
            Limits: 50 tracks total, 20 per section. Compatibility score uses the Dice coefficient: <code>2 × |shared| / (|A| + |B|) × 100</code>.
          </p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Feedback" title="Improving Your Recommendations">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            Each track row shows <strong>👍 👎 ⏭</strong> controls on hover. Your feedback is stored and used to boost or penalize tracks in future blends — liked tracks score higher, skipped tracks score lower.
          </p>
          <p>
            After viewing the playlist you can also rate the overall blend (1–5 stars) and leave a quick note (&quot;Felt accurate&quot; or &quot;Missed the vibe&quot;). This helps improve the algorithm over time.
          </p>
          <p>All feedback is optional and dismissible — it never blocks your workflow.</p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Security" title="Privacy & Authentication">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h3 className="text-white font-bold text-base mt-2">Why do you need my headers_auth.json?</h3>
          <p>
            YouTube Music does not have a public API for creating playlists or reading private Liked Songs. The only way to automate these features is by providing the session cookies your browser uses to prove you are logged in.
          </p>
          <h3 className="text-white font-bold text-base mt-6">Is it safe?</h3>
          <p className="bg-brand-ytmusic/5 p-4 rounded-xl border border-brand-ytmusic/20">
            <strong className="text-white">Yes.</strong> The moment you upload your <code>headers_auth.json</code>, the backend encrypts it with AES-128-CBC (Fernet) before it ever touches the database. The raw file is <em>never</em> logged or stored in plaintext. It is used only for the duration of the fetch or export operation.
          </p>
          <h3 className="text-white font-bold text-base mt-6">How do I get headers_auth.json?</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Open <a href="https://music.youtube.com" target="_blank" rel="noreferrer" className="text-brand-ytmusic hover:underline">music.youtube.com</a> and log in.</li>
            <li>Open DevTools (F12) → Network tab.</li>
            <li>Filter by <code>browse</code> or <code>next</code> and click around the site to trigger a request.</li>
            <li>Click the request → Request Headers → right-click → Copy object.</li>
            <li>Paste into a text file and save as <code>headers_auth.json</code>.</li>
          </ol>
        </div>
      </SectionCard>

      <SectionCard eyebrow="FAQ" title="Frequently Asked Questions">
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <div>
            <h3 className="text-white font-bold mb-1">Does this work with Spotify?</h3>
            <p>No. Merge is built specifically for YouTube Music. It uses <code>ytmusicapi</code> to fetch tracks and create playlists.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">How many playlist links can I add?</h3>
            <p>Up to 5 per listener. Each link must be a valid YouTube Music playlist URL (<code>music.youtube.com/playlist?list=...</code>).</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">Is there a track limit?</h3>
            <p>Yes — 50 tracks total, 20 per section. This keeps the playlist focused and prevents YouTube Music rate-limiting.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">My blend generation failed — what gives?</h3>
            <p>Make sure the playlists you provided are set to <strong>Public</strong> or <strong>Unlisted</strong>. Private playlists cannot be read by the server unless you have uploaded your auth file and the playlist belongs to you.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">Is Merge free?</h3>
            <p>Yes. Merge is free, open-source, and community-driven. There are no subscriptions or lock-in. Check out the project on <a href="https://github.com/Erebuzzz/merge" target="_blank" rel="noreferrer" className="text-brand-ytmusic hover:underline">GitHub</a>.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
