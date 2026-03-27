import { AuthUploadPanel } from "@/components/auth/auth-upload-panel";

type AuthUploadPageProps = {
  searchParams?: Promise<{
    userId?: string;
  }>;
};

export default async function AuthUploadPage({ searchParams }: AuthUploadPageProps) {
  const params = (await searchParams) ?? {};
  return <AuthUploadPanel presetUserId={params.userId ?? ""} />;
}
