import { SectionCard } from "@/components/ui/section-card";

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up space-y-8 md:space-y-10">
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-display-lg md:text-display-xl font-display text-white pb-1">
          Documentation & FAQ
        </h1>
        <p className="text-text-secondary mt-2 text-sm md:text-base">Everything you need to know about Merge.</p>
      </div>

      <SectionCard eyebrow="Guide" title="How to Create a Blend">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>Merge now supports two creation paths:</p>
          <div className="space-y-3">
            <div className="glass-surface rounded-xl p-4 md:p-5">
              <h3 className="font-bold text-white text-sm mb-1">1. Paste Mode (Solo)</h3>
              <p className="text-xs">Go to <strong>Create Blend</strong>. Add your own playlists (picker or pasted URLs), then paste your friend&apos;s public URLs. No login required for your friend.</p>
            </div>
            <div className="glass-surface rounded-xl p-4 md:p-5">
              <h3 className="font-bold text-white text-sm mb-1">2. Invite Mode (Collaborative)</h3>
              <p className="text-xs">Go to <strong>Invite</strong>, generate a link, and send it. Your friend opens it on their own device, logs in, connects YouTube Music, then joins.</p>
            </div>
            <div className="glass-surface rounded-xl p-4 md:p-5">
              <h3 className="font-bold text-white text-sm mb-1">3. Generate & Export</h3>
              <p className="text-xs">Click <strong>Generate Blend</strong>. Merge analyzes your input, finds the overlap, scores compatibility, and builds a balanced playlist. Click <strong>Sync to YT Music</strong> to push it to your library.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Under the Hood" title="How the Algorithm Works">
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>Merge builds a playlist in four sections:</p>
          <ul className="list-disc pl-5 space-y-2 marker:text-brand-ytmusic text-xs">
            <li><strong className="text-white">Shared Taste</strong> — tracks in both libraries after normalization and fuzzy matching.</li>
            <li><strong className="text-white">From User A / B</strong> — unique tracks ranked by overlap ratio, artist similarity, and diversity.</li>
            <li><strong className="text-white">New Discoveries</strong> — algorithmic radio picks seeded from shared tracks, filtered for novelty.</li>
          </ul>
          <p className="text-[11px] text-text-muted pt-2">
            Limits: 50 tracks total, 20 per section. Compatibility: <code className="text-brand-ytmusic">2 x |shared| / (|A| + |B|) x 100</code>.
          </p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Feedback" title="Improving Recommendations">
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>Each track shows feedback controls on hover (desktop) or always visible (mobile). Your feedback is stored and influences future blend scoring.</p>
          <p>After viewing the playlist you can rate the overall blend (1-5 stars) and leave a quick note. All feedback is optional.</p>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Security" title="Privacy & Authentication">
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <div className="glass-surface rounded-xl p-4">
            <h3 className="text-white font-bold text-sm mb-1">How does login work?</h3>
            <p className="text-xs">Merge uses Google OAuth. After login, the backend redirects to the frontend with a short-lived session token. The frontend stores it locally and sends it as <code>Authorization: Bearer</code> on each request.</p>
          </div>
          <div className="glass-surface rounded-xl p-4">
            <h3 className="text-white font-bold text-sm mb-1">Do invite links expire?</h3>
            <p className="text-xs">Yes. Invite links expire in 7 days and can only be joined once.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="FAQ" title="Common Questions">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          {[
            { q: "Does this work with Spotify?", a: "No. Merge is built specifically for YouTube Music using ytmusicapi." },
            { q: "How many playlists can I add?", a: "Up to 5 per listener. Each must be a valid YouTube Music playlist URL." },
            { q: "Is there a track limit?", a: "Yes — 50 tracks total, 20 per section." },
            { q: "My blend failed — what gives?", a: "Make sure pasted playlists are Public or Unlisted. In Invite Mode, both users should connect YouTube Music." },
            { q: "Is Merge free?", a: (<>Yes. Free, open-source, and community-driven. <a href="https://github.com/Erebuzzz/merge-ytm" target="_blank" rel="noreferrer" className="text-brand-ytmusic hover:underline">View on GitHub</a>.</>) },
          ].map((item) => (
            <div key={typeof item.q === "string" ? item.q : "free"}>
              <h3 className="text-white font-bold text-sm mb-1">{item.q}</h3>
              <p className="text-xs">{item.a}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
