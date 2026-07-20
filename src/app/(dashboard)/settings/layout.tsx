"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/profile", label: "Perfil" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/members", label: "Membros" },
  { href: "/settings/billing", label: "Faturamento" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1 text-sm">Gerencie sua conta e workspace.</p>
      </div>

      <div className="mb-8 flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
              pathname === tab.href || (tab.href === "/settings/billing" && pathname.startsWith("/settings/billing"))
                ? "text-violet-700 border-b-2 border-violet-600 bg-violet-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
