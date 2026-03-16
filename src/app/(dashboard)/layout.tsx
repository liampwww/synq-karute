"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { LoadingSkeleton } from "@/components/layout/loading-skeleton";

function getPageFromPath(pathname: string): string {
  if (pathname.startsWith("/recording")) return "recording";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/appointments")) return "appointments";
  if (pathname.startsWith("/karute")) return "karute";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/ask-ai")) return "askAi";
  if (pathname.startsWith("/migration")) return "migration";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/dashboard") || pathname === "/") return "dashboard";
  return "default";
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isLoading } = useAuth();
  const pathname = usePathname();
  const [timedOut, setTimedOut] = useState(false);
  const page = getPageFromPath(pathname ?? "");

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(id);
  }, []);

  if (isLoading && !timedOut) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div
            className="app-content mx-auto max-w-7xl"
            data-page={page}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
