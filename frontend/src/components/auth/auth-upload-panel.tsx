"use client";

import { type FormEvent, useMemo, useState } from "react";

import { uploadAuth } from "@/lib/api";
import { useBlendStore } from "@/store/blend-store";
import { SectionCard } from "@/components/ui/section-card";

type AuthUploadPanelProps = {
  presetUserId?: string;
};

export function AuthUploadPanel({ presetUserId = "" }: AuthUploadPanelProps) {
  const result = useBlendStore((state) => state.result);
  const [userId, setUserId] = useState(presetUserId);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error" | "submitting" | "idle">("idle");

  const knownUsers = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: result.participants.userA.name, value: result.participants.userA.userId },
      { label: result.participants.userB.name, value: result.participants.userB.userId },
    ];
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId.trim()) {
      setTone("error");
      setMessage("Provide a listener user id.");
      return;
    }

    if (!file) {
      setTone("error");
      setMessage("Choose a JSON auth file first.");
      return;
    }

    setTone("submitting");
    setMessage("Uploading auth...");

    try {
      await uploadAuth(userId.trim(), file);
      setTone("success");
      setMessage("Auth file securely stored.");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not upload the auth file.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up mt-8">
      <SectionCard eyebrow="Private auth" title="Upload headers_auth.json">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-surface-highlight/30 px-6 py-5 text-sm leading-relaxed text-text-secondary">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-brand-ytmusic text-black flex items-center justify-center text-[10px]">?</span>
              How to get your headers_auth.json
            </h3>
            <ol className="list-decimal pl-4 space-y-3 text-xs">
              <li>Open <a href="https://music.youtube.com" target="_blank" rel="noreferrer" className="text-brand-ytmusic font-bold hover:underline">YouTube Music</a> on your computer and log in.</li>
              <li>Open <strong>Developer Tools</strong> (Right-click &gt; Inspect, or F12) and go to the <strong>Network</strong> tab.</li>
              <li>In the Network tab filter box, type <code>browse</code> or <code>next</code>.</li>
              <li>Click around the YouTube Music website (e.g., click a playlist) to trigger a network request.</li>
              <li>Click on the <code>browse</code> or <code>next</code> request that appears. In the side panel, scroll down to <strong>Request Headers</strong>.</li>
              <li>Right-click on the Request Headers section and select <strong>Copy object</strong> (Chrome) or copy the raw JSON.</li>
              <li>Paste the copied text into a new text file and save it as <code>headers_auth.json</code>.</li>
            </ol>
            <p className="mt-4 text-[11px] bg-brand-spotify/10 text-brand-spotify p-3 rounded-xl border border-brand-spotify/20">
              <strong>Privacy Note:</strong> This file contains your authentication session. Our backend immediately encrypts it before storing and uses it exclusively for fetching your likes and exporting the final blend.
            </p>
          </div>

          {knownUsers.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center mr-2">Quick Select:</span>
              {knownUsers.map((user) => (
                <button
                  key={user.value}
                  type="button"
                  onClick={() => setUserId(user.value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all border ${
                    userId === user.value 
                      ? "bg-brand-spotify/10 border-brand-spotify text-brand-spotify" 
                      : "bg-surface-elevated border-white/10 text-text-secondary hover:text-white hover:border-white/30"
                  }`}
                >
                  {user.label}
                </button>
              ))}
            </div>
          ) : null}

          <form className="space-y-6 pt-4 border-t border-white/5" onSubmit={handleSubmit}>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text-muted">Auth file (.json)</span>
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full rounded-2xl border-2 border-dashed border-white/20 bg-surface-highlight/20 px-8 py-10 text-sm text-text-muted text-center group-hover:border-brand-spotify group-hover:bg-brand-spotify/5 transition-colors flex flex-col items-center justify-center min-h-[160px]">
                 {file ? (
                   <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-brand-spotify/20 text-brand-spotify flex items-center justify-center text-xl mb-2">✓</div>
                      <span className="text-white font-semibold text-base">{file.name}</span>
                      <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                   </div>
                 ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-surface-elevated text-text-muted flex items-center justify-center text-xl mb-2 group-hover:text-brand-spotify group-hover:scale-110 transition-all">+</div>
                      <span className="font-semibold text-text-secondary block group-hover:text-white transition-colors">Click to select or drag and drop</span>
                      <span className="text-xs">JSON files only</span>
                    </div>
                 )}
                </div>
              </div>
            </label>

            <button 
              type="submit" 
              disabled={tone === "submitting"}
              className="w-full rounded-full bg-white px-6 py-4 text-sm font-bold text-black transition hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {tone === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                  Uploading...
                </span>
              ) : "Secure Upload"}
            </button>

            {message ? (
              <p className={`text-xs font-medium text-center p-3 rounded-lg animate-fade-in-up
                ${tone === "error" ? "bg-brand-ytred/10 text-brand-ytred border border-brand-ytred/20" : 
                  tone === "success" ? "bg-brand-spotify/10 text-brand-spotify border border-brand-spotify/20" : 
                  "text-text-muted"}
              `}>
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
