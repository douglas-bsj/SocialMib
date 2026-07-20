"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PLATFORMS = [
  {
    id: "twitter",
    name: "X (Twitter)",
    bg: "bg-black",
    text: "text-white",
    icon: "𝕏",
    desc: "Poste tweets e threads. Requer conta de desenvolvedor.",
    isSpecial: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    text: "text-white",
    icon: "📸",
    desc: "Publique fotos e reels. Requer conta Business ou Creator.",
    isSpecial: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    bg: "bg-blue-600",
    text: "text-white",
    icon: "f",
    desc: "Poste em Páginas do Facebook. Requer permissão de admin.",
    isSpecial: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    bg: "bg-blue-700",
    text: "text-white",
    icon: "in",
    desc: "Compartilhe atualizações profissionais e artigos.",
    isSpecial: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    bg: "bg-gray-900",
    text: "text-white",
    icon: "♪",
    desc: "Publique vídeos curtos. Requer conta de criador.",
    isSpecial: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    bg: "bg-red-600",
    text: "text-white",
    icon: "▶",
    desc: "Publique vídeos no seu canal do YouTube.",
    isSpecial: false,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    bg: "bg-red-500",
    text: "text-white",
    icon: "P",
    desc: "Crie e publique pins em boards.",
    isSpecial: false,
  },
  {
    id: "bluesky",
    name: "Bluesky",
    bg: "bg-sky-500",
    text: "text-white",
    icon: "🦋",
    desc: "Rede descentralizada. Usa app password em vez de OAuth.",
    isSpecial: true,
  },
  {
    id: "threads",
    name: "Threads",
    bg: "bg-gray-900",
    text: "text-white",
    icon: "@",
    desc: "Publique no Threads da Meta. Requer conta Instagram.",
    isSpecial: false,
  },
  {
    id: "reddit",
    name: "Reddit",
    bg: "bg-orange-600",
    text: "text-white",
    icon: "🤖",
    desc: "Poste em subreddits. Requer conta de desenvolvedor.",
    isSpecial: false,
  },
];

interface SocialAccount {
  id: string;
  platform: string;
  name: string;
  username?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
}

const PLATFORM_ENUM_TO_ID: Record<string, string> = {
  TWITTER: "twitter",
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  LINKEDIN: "linkedin",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  PINTEREST: "pinterest",
  BLUESKY: "bluesky",
  THREADS: "threads",
  REDDIT: "reddit",
};

function AccountsPageContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [blueskyOpen, setBlueskyOpen] = useState(false);
  const [blueskyHandle, setBlueskyHandle] = useState("");
  const [blueskyPass, setBlueskyPass] = useState("");
  const [blueskyLoading, setBlueskyLoading] = useState(false);
  const [blueskyError, setBlueskyError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetchAccounts();
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success === "connected") {
      showNotification("success", "Conta conectada com sucesso!");
    } else if (error) {
      showNotification("error", decodeURIComponent(error));
    }
  }, []);

  function showNotification(type: "success" | "error", msg: string) {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  }

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      showNotification("error", "Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAccount(id: string, isActive: boolean) {
    setTogglingId(id);
    try {
      await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a)));
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteAccount(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      showNotification("success", "Conta removida.");
    } finally {
      setDeletingId(null);
    }
  }

  async function connectBluesky(e: React.FormEvent) {
    e.preventDefault();
    setBlueskyLoading(true);
    setBlueskyError("");
    try {
      const res = await fetch("/api/social/bluesky/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: blueskyHandle, appPassword: blueskyPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBlueskyError(data.error ?? "Erro ao conectar.");
        return;
      }
      setBlueskyOpen(false);
      setBlueskyHandle("");
      setBlueskyPass("");
      showNotification("success", "Bluesky conectado com sucesso!");
      fetchAccounts();
    } catch {
      setBlueskyError("Erro de rede. Tente novamente.");
    } finally {
      setBlueskyLoading(false);
    }
  }

  function handleConnect(platform: (typeof PLATFORMS)[0]) {
    if (platform.isSpecial) {
      setConnectOpen(false);
      setBlueskyOpen(true);
    } else {
      window.location.href = `/api/social/${platform.id}/connect`;
    }
  }

  const connectedPlatformIds = accounts.map(
    (a) => PLATFORM_ENUM_TO_ID[a.platform] ?? a.platform.toLowerCase()
  );

  return (
    <div className="p-8">
      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            notification.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {notification.msg}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas de Redes Sociais</h1>
          <p className="mt-1 text-sm text-gray-500">
            Conecte suas contas para publicar e agendar posts
          </p>
        </div>
        <Button onClick={() => setConnectOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Conectar Conta
        </Button>
      </div>

      {/* Connected accounts */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
              📱
            </div>
            <h3 className="text-base font-semibold text-gray-900">Nenhuma conta conectada</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Conecte suas redes sociais para começar a agendar publicações
            </p>
            <Button className="mt-6 gap-2" onClick={() => setConnectOpen(true)}>
              <Plus className="h-4 w-4" />
              Conectar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const platformId = PLATFORM_ENUM_TO_ID[account.platform] ?? account.platform.toLowerCase();
            const platform = PLATFORMS.find((p) => p.id === platformId);
            return (
              <Card key={account.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {account.profileImage ? (
                        <img
                          src={account.profileImage}
                          alt={account.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${platform?.bg ?? "bg-gray-200"} ${platform?.text ?? "text-gray-900"}`}
                        >
                          {platform?.icon ?? account.platform[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{account.name}</p>
                        {account.username && (
                          <p className="text-xs text-gray-400">@{account.username}</p>
                        )}
                        <p className="text-xs text-gray-400">{platform?.name ?? account.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {account.isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Switch
                        checked={account.isActive}
                        disabled={togglingId === account.id}
                        onCheckedChange={() => toggleAccount(account.id, account.isActive)}
                      />
                      <span>{account.isActive ? "Ativa" : "Inativa"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-gray-600"
                        onClick={fetchAccounts}
                        title="Atualizar"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-600"
                        disabled={deletingId === account.id}
                        onClick={() => deleteAccount(account.id)}
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Dialog: Connect ── */}
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conectar Conta</DialogTitle>
            <DialogDescription>
              Escolha a plataforma que deseja conectar ao seu workspace
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLATFORMS.map((platform) => {
              const isConnected = connectedPlatformIds.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  disabled={isConnected}
                  onClick={() => handleConnect(platform)}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-left transition-all hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${platform.bg} ${platform.text}`}
                  >
                    {platform.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm">{platform.name}</p>
                      {isConnected ? (
                        <Badge variant="success" className="text-xs shrink-0">Conectado</Badge>
                      ) : platform.isSpecial ? (
                        <Badge variant="secondary" className="text-xs shrink-0">App Password</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{platform.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Bluesky ── */}
      <Dialog open={blueskyOpen} onOpenChange={setBlueskyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white text-sm">🦋</span>
              Conectar Bluesky
            </DialogTitle>
            <DialogDescription>
              O Bluesky usa <strong>App Passwords</strong> em vez de OAuth.
              Crie uma em <strong>Configurações → App Passwords</strong> no Bluesky.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={connectBluesky} className="mt-2 space-y-4">
            {blueskyError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {blueskyError}
              </div>
            )}
            <div>
              <Label htmlFor="bsky-handle">Handle</Label>
              <Input
                id="bsky-handle"
                type="text"
                placeholder="seuusuario.bsky.social"
                value={blueskyHandle}
                onChange={(e) => setBlueskyHandle(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bsky-pass">App Password</Label>
              <Input
                id="bsky-pass"
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={blueskyPass}
                onChange={(e) => setBlueskyPass(e.target.value)}
                required
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-400">
                Não use sua senha principal. Crie um App Password em{" "}
                <a
                  href="https://bsky.app/settings/app-passwords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 underline"
                >
                  bsky.app/settings/app-passwords
                </a>
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setBlueskyOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={blueskyLoading}>
                {blueskyLoading ? "Conectando..." : "Conectar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Carregando...</div>}>
      <AccountsPageContent />
    </Suspense>
  );
}
