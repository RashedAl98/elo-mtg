import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between border-b border-edge pb-3">
        <Link href="/admin" className="font-display text-lg font-bold tracking-wide text-gold-bright">
          Admin
        </Link>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
