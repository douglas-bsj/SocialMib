"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock, CheckCircle2, AlertCircle, Edit2, Trash2, Send, RefreshCw,
  List, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Lazy-load calendar (avoids SSR issues with react-big-calendar)
const CalendarView = dynamic(
  () => import("@/components/calendar-view").then((m) => m.CalendarView),
  { ssr: false, loading: () => <div className="h-[720px] animate-pulse rounded-xl bg-gray-100" /> }
);

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "outline" }> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  PENDING: { label: "Pendente", variant: "warning" },
  SCHEDULED: { label: "Agendado", variant: "default" },
  PUBLISHED: { label: "Publicado", variant: "success" },
  FAILED: { label: "Falhou", variant: "destructive" },
};

interface Post {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  socialAccounts: Array<{
    socialAccount: { id: string; platform: string; name: string };
    status: string;
  }>;
}

const PLATFORM_ICONS: Record<string, string> = {
  TWITTER: "𝕏", INSTAGRAM: "📸", FACEBOOK: "f", LINKEDIN: "in",
  TIKTOK: "♪", YOUTUBE: "▶", PINTEREST: "P", BLUESKY: "🦋", THREADS: "@",
};

type ViewMode = "list" | "calendar";

export default function SchedulePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Post | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      console.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(post: Post) {
    setConfirmDelete(null);
    setDeletingId(post.id);
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } finally {
      setDeletingId(null);
    }
  }

  async function retryPost(id: string) {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING", retry: true }),
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "PENDING" } : p))
        );
      }
    } finally {
      setRetryingId(null);
    }
  }

  const handleDeleteFromCalendar = useCallback((post: Post) => {
    setConfirmDelete(post);
  }, []);

  const filtered = filter === "ALL" ? posts : posts.filter((p) => p.status === filter);

  const stats = {
    ALL: posts.length,
    SCHEDULED: posts.filter((p) => p.status === "SCHEDULED").length,
    PUBLISHED: posts.filter((p) => p.status === "PUBLISHED").length,
    DRAFT: posts.filter((p) => p.status === "DRAFT").length,
    FAILED: posts.filter((p) => p.status === "FAILED").length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie todos os seus posts agendados e publicados
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "calendar"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendário
            </button>
          </div>

          <Link href="/publish">
            <Button className="gap-2">
              <Send className="h-4 w-4" />
              Novo Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <CalendarView posts={posts} onDelete={handleDeleteFromCalendar} />
      )}

      {/* List view */}
      {viewMode === "list" && (
        <>
          {/* Filter tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(stats).map(([key, count]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                  filter === key
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                )}
              >
                {key === "ALL" ? "Todos" : STATUS_CONFIG[key]?.label ?? key}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  filter === key ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-500"
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Posts list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                  📅
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  Nenhum post encontrado
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === "ALL"
                    ? "Crie seu primeiro post para começar"
                    : `Nenhum post com status "${STATUS_CONFIG[filter]?.label}"`}
                </p>
                <Link href="/publish" className="mt-6">
                  <Button>Criar post</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((post) => {
                const statusCfg = STATUS_CONFIG[post.status];
                return (
                  <Card key={post.id} className="overflow-hidden hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Status icon */}
                        <div className="mt-0.5 shrink-0">
                          {post.status === "PUBLISHED" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : post.status === "FAILED" ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : post.status === "SCHEDULED" ? (
                            <Clock className="h-5 w-5 text-blue-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">{post.content}</p>

                          {post.socialAccounts.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {post.socialAccounts.map((psa) => (
                                <span
                                  key={psa.socialAccount.id}
                                  className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                >
                                  {PLATFORM_ICONS[psa.socialAccount.platform] ?? "📱"}
                                  {psa.socialAccount.name}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-3">
                            <Badge variant={statusCfg?.variant ?? "secondary"}>
                              {statusCfg?.label ?? post.status}
                            </Badge>
                            {post.scheduledAt && (
                              <span className="text-xs text-gray-400">
                                📅 {formatDate(post.scheduledAt)}
                              </span>
                            )}
                            {post.publishedAt && (
                              <span className="text-xs text-gray-400">
                                ✅ Publicado em {formatDate(post.publishedAt)}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              Criado em {formatDate(post.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {post.status === "FAILED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              disabled={retryingId === post.id}
                              onClick={() => retryPost(post.id)}
                            >
                              <RefreshCw className={cn("h-3.5 w-3.5", retryingId === post.id && "animate-spin")} />
                              Tentar novamente
                            </Button>
                          )}
                          {(post.status === "DRAFT" || post.status === "SCHEDULED") && (
                            <Link href={`/publish?edit=${post.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-gray-700"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            disabled={deletingId === post.id}
                            onClick={() => setConfirmDelete(post)}
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
        </>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir post</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <div className="my-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="line-clamp-2 text-sm text-gray-700">{confirmDelete.content}</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!!deletingId}
              onClick={() => confirmDelete && deletePost(confirmDelete)}
            >
              {deletingId ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
