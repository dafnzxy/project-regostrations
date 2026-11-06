import { checkAdminAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminNavigation } from "../AdminNavigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    redirect("/dashboard/login");
  }

  // Ambil event terbaru secara dinamis agar tombol Akses Cepat di sidebar selalu valid & tidak pernah 404
  const latestEvent = await prisma.event.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true },
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-transparent text-slate-900 relative">
      {/* Subtle Ambient Refraction Orbs Behind Liquid Glass */}
      <div className="fixed top-10 left-1/4 w-96 h-96 bg-indigo-400/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-sky-400/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Responsive Navigation: Mobile Sticky Topbar + Slide Drawer + Bottom Tabbar + Desktop Sidebar Dock */}
      <AdminNavigation latestEvent={latestEvent} />

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-7 xl:p-8 pb-24 sm:pb-10 max-w-7xl mx-auto w-full min-w-0">
        {children}
      </main>
    </div>
  );
}
