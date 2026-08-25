"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Send,
  Calendar,
  BarChart2,
  Settings,
  ChevronDown,
  Zap,
  LogOut,
  Plus,
  MessageCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { NotificationBell } from "./notification-bell";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/accounts", icon: Users, label: "Contas" },
  { href: "/publish", icon: Send, label: "Publicar" },
  { href: "/schedule", icon: Calendar, label: "Agendamentos" },
  { href: "/inbox", icon: MessageCircle, label: "Inbox" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
];

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  workspace?: {
    name: string;
    slug: string;
  };
  inboxUnread?: number;
}

export function Sidebar({ user, workspace, inboxUnread = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900">Mib Social</span>
      </div>

      {/* Workspace switcher */}
      <div className="border-b border-gray-100 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-100 text-violet-700 font-semibold text-xs">
                {workspace?.name?.[0] ?? "W"}
              </div>
              <span className="flex-1 font-medium text-gray-700 truncate">
                {workspace?.name ?? "Meu Workspace"}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="start">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="font-medium text-violet-600">
              {workspace?.name ?? "Meu Workspace"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              Novo Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn("h-4 w-4 shrink-0", isActive ? "text-violet-600" : "text-gray-400")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 p-3 space-y-0.5">
        {/* Settings + Notifications row */}
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Settings className="h-4 w-4 text-gray-400" />
            Configurações
          </Link>
          <div className="px-1">
            <NotificationBell initialUnread={inboxUnread} />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.image ?? ""} />
                <AvatarFallback className="text-xs">
                  {user?.name?.[0] ?? user?.email?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-700 text-xs truncate">
                  {user?.name ?? "Usuário"}
                </p>
                <p className="text-gray-400 text-xs truncate">{user?.email ?? ""}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end" side="top">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/billing">Plano e faturamento</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
