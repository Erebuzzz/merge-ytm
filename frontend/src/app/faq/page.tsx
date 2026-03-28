import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-10">
      <div className="text-center mb-12">
        <h1 className="font-display text-5xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-brand-spotify to-brand-ytmusic pb-2">
          Documentation & FAQ
        </h1>
        <p className="text-text-secondary mt-2 text-lg">Everything you need to know about YTMusic Sync.</p>
      </div>

      <SectionCard eyebrow="Guide" title="How to Create a Blend">
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <p>Creating a blend is simple and takes less than a minute. Here are the steps:</p>
          <div className="space-y-4">
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-2">1. Paste Playlists</h3>
              <p>Go to the <strong>Create Blend</strong> page. You and your friend each paste a link to a public YouTube Music playlist. We'll extract the songs from these to understand your tastes.</p>
            </div>
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-2">2. Upload Auth (Optional but Recommended)</h3>
              <p>To include your <em>Liked Songs</em> in the calculation, or to <em>Export the final playlist</em> to your account, you need to upload your <code>headers_auth.json</code> file on the <strong>Auth Upload</strong> page. Skip this if you just want to use public playlists and preview the result in the browser.</p>
            </div>
            <div className="bg-surface-highlight/20 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white text-base mb-2">3. Generate & Export</h3>
              <p>Click Generate. We'll analyze your input, find the overlap, fetch new algorithmic discoveries, and present a perfectly balanced playlist. Click <strong>Sync to YT Music</strong> to push it straight to your library.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Under the Hood" title="How the Algorithm Works">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            YTMusic Sync mimics the algorithmic magic of Spotify Blend by calculating a perfectly bridged playlist between two users. It's broken into three main sections:
          </p>
          <ul className="list-disc pl-5 space-y-2 marker:text-brand-spotify">
            <li>
              <strong className="text-white">Shared Taste:</strong> We first find all tracks that exist in both of your inputs. These form the core anchor of the playlist.
            </li>
            <li>
              <strong className="text-white">From User A & User B:</strong> For the tracks you <em>don't</em> share, we run a scoring algorithm that checks for artist similarity (e.g., if User A likes a Weekend song, and User B likes a different Weekend song, they score highly) while maintaining artist diversity penalty so one artist doesn't dominate.
            </li>
            <li>
              <strong className="text-white">New Discoveries:</strong> We take your top shared tracks and ask the YouTube Music algorithm for "Up Next/Radio" recommendations. We strictly filter out any songs you already know, introducing brand new music you're both statistically guaranteed to love.
            </li>
          </ul>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Security" title="Privacy & Authentication">
        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h3 className="text-white font-bold text-base mt-2">Why do you need my headers_auth.json?</h3>
          <p>
            YouTube Music doesn't have a public Developer API for creating playlists or viewing private Liked Songs. The only way to automate these features is by providing the "cookies" your browser uses to prove you are logged in.
          </p>
          <h3 className="text-white font-bold text-base mt-6">Is it safe?</h3>
          <p className="bg-brand-spotify/5 p-4 rounded-xl border border-brand-spotify/20">
            <strong>Yes.</strong> The moment you upload your <code>headers_auth.json</code>, our backend uses a master cryptographic key to aggressively encrypt the file before it ever hits the database. The raw text is <em>never</em> logged, and the file is strictly used temporarily when fetching liked songs or exporting the playlist.
          </p>
        </div>
      </SectionCard>
      
      <SectionCard eyebrow="FAQ" title="Frequently Asked Questions">
        <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <div>
            <h3 className="text-white font-bold mb-1">Does this work with Spotify?</h3>
            <p>No, this application is specifically designed as a workaround for YouTube Music users who want the "Spotify Blend" feature on their platform.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">Is there a limit on tracks?</h3>
            <p>Yes. To prevent YouTube Music from rate-limiting requests, we limit the final generated playlist to a max of heavily curated tracks per section.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-1">My blend generation failed, what gives?</h3>
            <p>Ensure that the playlists you provided are set to <strong>Public</strong> or <strong>Unlisted</strong>. Private playlists cannot be read by the server unless you've uploaded your auth file and the playlist belongs to you.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
