"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare, AtSign, Mail, RefreshCw, CheckCheck,
  ExternalLink, Filter, Inbox, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InboxType = "COMMENT" | "MENTION" | "MESSAGE";
type Platform =
  | "TWITTER" | "INSTAGRAM" | "FACEBOOK" | "LINKEDIN"
  | "TIKTOK" | "YOUTUBE" | "PINTEREST" | "REDDIT"
  | "BLUESKY" | "THREADS";

interface InboxItem {
  id: string;
  type: InboxType;
  platform: Platform;
  authorName: string;
  authorUsername: string | null;
  authorImage: string | null;
  text: string;
  postUrl: string | null;
  isRead: boolean;
  receivedAt: string;
  socialAccount: { name: string; username: string | null; profileImage: string | null };
}

interface Props {
  initialItems: InboxItem[];
  initialUnread: number;
  connectedPlatforms: Platform[];
  workspaceId: string;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  TWITTER: "X / Twitter", INSTAGRAM: "Instagram", FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn", TIKTOK: "TikTok", YOUTUBE: "YouTube",
  PINTEREST: "Pinterest", REDDIT: "Reddit", BLUESKY: "Bluesky", THREADS: "Threads",
};

const PLATFORM_COLORS: Record<Platform, string> = {
  TWITTER: "bg-sky-100 text-sky-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
  FACEBOOK: "bg-blue-100 text-blue-700",
  LINKEDIN: "bg-blue-100 text-blue-800",
  TIKTOK: "bg-rose-100 text-rose-700",
  YOUTUBE: "bg-red-100 text-red-700",
  PINTEREST: "bg-red-100 text-red-800",
  REDDIT: "bg-orange-100 text-orange-700",
  BLUESKY: "bg-sky-100 text-sky-800",
  THREADS: "bg-violet-100 text-violet-700",
};

const TYPE_ICONS: Record<InboxType, React.ElementType> = {
  COMMENT: MessageSquare,
  MENTION: AtSign,
  MESSAGE: Mail,
};

const TYPE_LABELS: Record<InboxType, string> = {
  COMMENT: "Comentário",
  MENTION: "Menção",
  MESSAGE: "Mensagem",
};

const SYNCABLE: Platform[] = ["INSTAGRAM", "FACEBOOK", "TWITTER", "THREADS", "LINKEDIN"];

function Avatar({ name, image }: { name: string; image: string | null }) {
  const initials = name.slice(0, 2).toUpperCase();
  return image ? (
    <img src={image} alt={name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
      {initials}
    </div>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

export function InboxClient({ initialItems, initialUnread, connectedPlatforms, workspaceId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [activePlatform, setActivePlatform] = useState<Platform | "ALL">("ALL");
  const [activeType, setActiveType] = useState<InboxType | "ALL">("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = items.filter((item) => {
    if (activePlatform !== "ALL" && item.platform !== activePlatform) return false;
    if (activeType !== "ALL" && item.type !== activeType) return false;
    if (unreadOnly && item.isRead) return false;
    return true;
  });

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, isRead: true } : i));
    setUnread((prev) => Math.max(0, prev - 1));
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnread(0);
    await fetch("/api/inbox/read-all", { method: "POST" });
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/inbox/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      // Reload items
      setLoading(true);
      const itemsRes = await fetch("/api/inbox");
      const itemsData = await itemsRes.json();
      setItems(itemsData.items ?? []);
      setUnread(itemsData.unreadCount ?? 0);
      setLoading(false);
    } catch {
      setSyncResult({ synced: 0, errors: ["Erro de conexão."] });
    } finally {
      setSyncing(false);
    }
  }, []);

  const hasSyncable = connectedPlatforms.some((p) => SYNCABLE.includes(p));

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Inbox</span>
              {unread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Type filter */}
          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Tipo</p>
            <div className="space-y-0.5">
              {(["ALL", "COMMENT", "MENTION", "MESSAGE"] as const).map((type) => {
                const Icon = type === "ALL" ? Filter : TYPE_ICONS[type];
                const label = type === "ALL" ? "Todos" : TYPE_LABELS[type];
                const count = type === "ALL" ? items.length : items.filter((i) => i.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      activeType === type
                        ? "bg-violet-50 text-violet-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </div>
                    <span className="text-[11px] text-gray-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform filter */}
          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Plataforma</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActivePlatform("ALL")}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  activePlatform === "ALL"
                    ? "bg-violet-50 text-violet-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <span>Todas</span>
                <span className="text-[11px] text-gray-400">{items.length}</span>
              </button>
              {([...new Set(items.map((i) => i.platform))] as Platform[]).map((platform) => {
                const count = items.filter((i) => i.platform === platform).length;
                return (
                  <button
                    key={platform}
                    onClick={() => setActivePlatform(platform)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      activePlatform === platform
                        ? "bg-violet-50 text-violet-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <span>{PLATFORM_LABELS[platform]}</span>
                    <span className="text-[11px] text-gray-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unread toggle */}
          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Filtrar</p>
            <button
              onClick={() => setUnreadOnly((v) => !v)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                unreadOnly
                  ? "bg-violet-50 text-violet-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              Apenas não lidos
              {unread > 0 && (
                <span className="ml-auto text-[11px] text-gray-400">{unread}</span>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todos como lidos
            </button>
          )}
          <button
            onClick={sync}
            disabled={syncing || !hasSyncable}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Sincronizando..." : "Sincronizar agora"}
          </button>
          {!hasSyncable && (
            <p className="text-[11px] text-center text-gray-400">
              Conecte uma conta para sincronizar.
            </p>
          )}
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">
              {activePlatform === "ALL" ? "Todas as mensagens" : PLATFORM_LABELS[activePlatform]}
              {activeType !== "ALL" && ` · ${TYPE_LABELS[activeType]}s`}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              {unreadOnly && " (não lidos)"}
            </p>
          </div>
          {syncResult && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5",
              syncResult.errors.length === 0
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            )}>
              {syncResult.errors.length === 0
                ? `✓ ${syncResult.synced} novos itens sincronizados`
                : `${syncResult.errors.length} erro(s) na sincronização`}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              {connectedPlatforms.length === 0 ? (
                <>
                  <WifiOff className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">Nenhuma conta conectada</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Conecte suas redes sociais em{" "}
                    <a href="/contas" className="text-violet-600 hover:underline">Contas</a>{" "}
                    para ver comentários e mensagens aqui.
                  </p>
                </>
              ) : (
                <>
                  <Wifi className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Clique em <strong>Sincronizar agora</strong> para buscar comentários e menções das suas contas.
                  </p>
                  <button
                    onClick={sync}
                    disabled={syncing}
                    className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                    {syncing ? "Sincronizando..." : "Sincronizar agora"}
                  </button>
                </>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const TypeIcon = TYPE_ICONS[item.type];
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.isRead && markRead(item.id)}
                    className={cn(
                      "flex gap-3 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50",
                      !item.isRead && "bg-violet-50/40"
                    )}
                  >
                    {/* Unread dot */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", !item.isRead ? "bg-violet-500" : "bg-transparent")} />
                    </div>

                    {/* Avatar */}
                    <Avatar name={item.authorName} image={item.authorImage} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{item.authorName}</span>
                        {item.authorUsername && (
                          <span className="text-xs text-gray-400">@{item.authorUsername}</span>
                        )}
                        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", PLATFORM_COLORS[item.platform])}>
                          {PLATFORM_LABELS[item.platform]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                          <TypeIcon className="h-2.5 w-2.5" />
                          {TYPE_LABELS[item.type]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">{item.text}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-gray-400">{formatDate(item.receivedAt)}</span>
                        <span className="text-[11px] text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{item.socialAccount.name}</span>
                        {item.postUrl && (
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-700"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            Ver post
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
