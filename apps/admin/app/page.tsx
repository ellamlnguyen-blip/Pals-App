import Console from "./console";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Console configured={Boolean(process.env.SUPABASE_PUBLISHABLE_KEY)} />;
}
