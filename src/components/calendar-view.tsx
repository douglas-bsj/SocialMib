"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";

import { useMemo, useState, useCallback } from "react";
import { Calendar, momentLocalizer, Views, type View } from "react-big-calendar";
import moment from "moment";
import "moment/locale/pt-br";
import Link from "next/link";
import { Edit2, Trash2, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

moment.locale("pt-br");
const localizer = momentLocalizer(moment);

const STATUS_CONFIG = {
  DRAFT: { label: "Rascunho", color: "#6B7280", bg: "#F3F4F6", variant: "secondary" as const },
  PENDING: { label: "Pendente", color: "#D97706", bg: "#FFFBEB", variant: "warning" as const },
  SCHEDULED: { label: "Agendado", color: "#2563EB", bg: "#EFF6FF", variant: "default" as const },
  PUBLISHED: { label: "Publicado", color: "#059669", bg: "#ECFDF5", variant: "success" as const },
  FAILED: { label: "Falhou", color: "#DC2626", bg: "#FEF2F2", variant: "destructive" as const },
};

const PLATFORM_ICONS: Record<string, string> = {
  TWITTER: "𝕏", INSTAGRAM: "📸", FACEBOOK: "f", LINKEDIN: "in",
  TIKTOK: "♪", YOUTUBE: "▶", PINTEREST: "P", BLUESKY: "🦋", THREADS: "@",
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Post;
}

interface Props {
  posts: Post[];
  onDelete: (post: Post) => void;
}

function EventComponent({ event }: { event: CalendarEvent }) {
  const cfg = STATUS_CONFIG[event.resource.status as keyof typeof STATUS_CONFIG];
  const platforms = event.resource.socialAccounts
    .slice(0, 3)
    .map((psa) => PLATFORM_ICONS[psa.socialAccount.platform] ?? "📱");

  return (
    <div className="flex items-center gap-1 truncate px-1 text-white text-xs font-medium">
      <span className="shrink-0">{platforms.join(" ")}</span>
      <span className="truncate">{event.resource.content}</span>
    </div>
  );
}

function PostDetailModal({
  post,
  onClose,
  onDelete,
}: {
  post: Post;
  onClose: () => void;
  onDelete: (post: Post) => void;
}) {
  const cfg = STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
  const canEdit = post.status === "DRAFT" || post.status === "SCHEDULED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {post.status === "PUBLISHED" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : post.status === "FAILED" ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-blue-500" />
            )}
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-800 leading-relaxed line-clamp-4">{post.content}</p>

          {/* Platforms */}
          {post.socialAccounts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
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

          {/* Dates */}
          <div className="mt-4 space-y-1 text-xs text-gray-400">
            {post.scheduledAt && (
              <p>📅 Agendado: {new Date(post.scheduledAt).toLocaleString("pt-BR")}</p>
            )}
            {post.publishedAt && (
              <p>✅ Publicado: {new Date(post.publishedAt).toLocaleString("pt-BR")}</p>
            )}
            <p>Criado: {new Date(post.createdAt).toLocaleString("pt-BR")}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          {canEdit && (
            <Link href={`/publish?edit=${post.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 hover:border-red-200 hover:bg-red-50"
            onClick={() => {
              onDelete(post);
              onClose();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CalendarView({ posts, onDelete }: Props) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  const events = useMemo<CalendarEvent[]>(() => {
    return posts
      .filter((p) => p.scheduledAt || p.publishedAt)
      .map((p) => {
        const dateStr = p.scheduledAt ?? p.publishedAt!;
        const start = new Date(dateStr);
        const end = new Date(start.getTime() + 30 * 60 * 1000); // 30min duration for display
        return {
          id: p.id,
          title: p.content,
          start,
          end,
          resource: p,
        };
      });
  }, [posts]);

  const eventPropGetter = useCallback((event: CalendarEvent) => {
    const cfg = STATUS_CONFIG[event.resource.status as keyof typeof STATUS_CONFIG];
    return {
      style: {
        backgroundColor: cfg?.color ?? "#6B7280",
        border: "none",
        borderRadius: "6px",
        color: "white",
        fontSize: "11px",
        padding: "2px 4px",
      },
    };
  }, []);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    const iso = start.toISOString().slice(0, 16);
    window.location.href = `/publish?scheduledAt=${encodeURIComponent(iso)}`;
  }, []);

  const messages = {
    today: "Hoje",
    previous: "‹",
    next: "›",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    agenda: "Agenda",
    date: "Data",
    time: "Hora",
    event: "Post",
    noEventsInRange: "Nenhum post neste período.",
    showMore: (count: number) => `+${count} mais`,
  };

  return (
    <>
      <div
        className="rounded-xl border border-gray-200 bg-white p-4"
        style={{ height: 680 }}
      >
        <style>{`
          .rbc-calendar { font-family: inherit; }
          .rbc-header { font-size: 12px; font-weight: 600; color: #6B7280; padding: 8px 0; border-color: #F3F4F6; }
          .rbc-today { background-color: #F5F3FF; }
          .rbc-off-range-bg { background-color: #FAFAFA; }
          .rbc-btn-group button { font-size: 12px; }
          .rbc-toolbar { margin-bottom: 12px; }
          .rbc-toolbar-label { font-size: 15px; font-weight: 700; color: #111827; }
          .rbc-event { cursor: pointer; }
          .rbc-event:focus { outline: none; box-shadow: 0 0 0 2px #7C3AED; }
          .rbc-show-more { font-size: 11px; color: #7C3AED; font-weight: 600; }
          .rbc-day-bg:hover { background-color: #F9F7FF; cursor: pointer; }
          .rbc-month-row { min-height: 80px; }
          .rbc-date-cell { font-size: 12px; padding: 4px 6px; }
          .rbc-date-cell.rbc-now { font-weight: 700; color: #7C3AED; }
          .rbc-row-bg + .rbc-row-bg { border-top: 1px solid #F3F4F6; }
          .rbc-month-view { border-color: #F3F4F6; border-radius: 8px; }
          .rbc-agenda-view table { font-size: 13px; }
          .rbc-agenda-date-cell { color: #374151; font-weight: 600; }
          .rbc-agenda-time-cell { color: #9CA3AF; }
          .rbc-time-view { border-color: #F3F4F6; }
          .rbc-time-header { border-color: #F3F4F6; }
          .rbc-time-content { border-color: #F3F4F6; }
          .rbc-timeslot-group { border-color: #F9FAFB; }
          .rbc-current-time-indicator { background-color: #7C3AED; }
        `}</style>
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onSelectEvent={(event: CalendarEvent) => setSelectedPost(event.resource)}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventPropGetter}
          components={{ event: EventComponent }}
          messages={messages}
          popup
          style={{ height: "100%" }}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="text-xs text-gray-500">{cfg.label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">Clique em um dia vazio para criar post</span>
      </div>

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
