import Console from "../console";

export const dynamic = "force-dynamic";

export default function PolicyPage() {
  return (
    <Console
      configured={Boolean(process.env.SUPABASE_PUBLISHABLE_KEY)}
      mode="policy"
    />
  );
}
