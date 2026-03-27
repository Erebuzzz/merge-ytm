"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { uploadAuth } from "@/lib/api";
import { useBlendStore } from "@/store/blend-store";
import { SectionCard } from "@/components/ui/section-card";

export function AuthUploadPanel() {
  const searchParams = useSearchParams();
  const presetUserId = searchParams.get("userId") ?? "";
  const result = useBlendStore((state) => state.result);
  const [userId, setUserId] = useState(presetUserId);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error" | null>(null);

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

    try {
      await uploadAuth(userId.trim(), file);
      setTone("success");
      setMessage("Auth file stored. Re-upload later if YouTube Music invalidates the session.");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Could not upload the auth file.");
    }
  }

  return (
    <SectionCard eyebrow="Private auth" title="Upload headers_auth.json">
      <div className="space-y-5">
        <div className="rounded-2xl bg-[#f8efe5] px-4 py-4 text-sm leading-7 text-[#5d5257]">
          Use this page for liked songs imports or final playlist export. The backend encrypts the uploaded JSON before writing it to the
          database and avoids logging the header payload.
        </div>

        {knownUsers.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {knownUsers.map((user) => (
              <button
                key={user.value}
                type="button"
                onClick={() => setUserId(user.value)}
                className="rounded-full border border-[#1d1720]/10 px-4 py-2 text-sm font-semibold transition hover:border-[#d96e3d] hover:text-[#d96e3d]"
              >
                Use {user.label}
              </button>
            ))}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Listener user id</span>
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Paste a backend user id"
              className="w-full rounded-2xl border border-[#1d1720]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d96e3d] focus:ring-2 focus:ring-[#d96e3d]/20"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#3b3238]">Auth JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-2xl border border-dashed border-[#1d1720]/15 bg-white px-4 py-4 text-sm text-[#5d5257]"
            />
          </label>

          <button type="submit" className="rounded-full bg-[#1d1720] px-6 py-3 text-sm font-semibold text-[#f9f0e3] transition hover:bg-[#433645]">
            Upload auth
          </button>

          {message ? <p className={`text-sm ${tone === "error" ? "text-[#b24d2c]" : "text-[#5f7757]"}`}>{message}</p> : null}
        </form>
      </div>
    </SectionCard>
  );
}
