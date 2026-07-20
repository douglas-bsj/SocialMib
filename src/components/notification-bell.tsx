"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, AlertCircle, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import type { NotificationEvent } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface StoredEvent {
  id: string;
  event: NotificationEvent;
  read: boolean;
}

const ICONS = {
  post_published: CheckCircle2,
  post_failed: AlertCircle,
  inbox_new: MessageCircle,
} as const;

const ICON_COLORS = {
  post_published: "text-green-500",
  post_failed: "text-red-500",
  inbox_new: "text-violet-500",
} as const;

function eventTitle(e: NotificationEvent): string {
  switch (e.type) {
    case "post_published":
      return `Post publicado em ${e.platforms.join(", ")}`;
    case "post_failed":
      return `Falha ao publicar em ${e.platforms.join(", ")}`;
    case "inbox_new":
      return `Nova mensagem de ${e.authorName}`;
  }
}

function eventBody(e: NotificationEvent): string {
  switch (e.type) {
    case "post_published":
    case "post_failed":
      return e.content.slice(0, 80) + (e.content.length > 80 ? "…" : "");
    case "inbox_new":
      return e.text.slice(0, 80) + (e.text.length > 80 ? "…" : "");
  }
}

function eventLink(e: NotificationEvent): string {
  switch (e.type) {
    case "post_published":
    case "post_failed":
      return "/schedule";
    case "inbox_new":
      return "/inbox";
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const [open, setOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(initialUnread);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const unread = events.filter((e) => !e.read).length + (inboxUnread > 0 ? 1 : 0);

  // Connect to SSE
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource("/api/notifications/stream");
      esRef.current = es;

      es.onmessage = (raw) => {
        try {
          const event = JSON.parse(raw.data) as NotificationEvent & { type: string };
          if ((event as { type: string }).type === "connected") return;

          const stored: StoredEvent = {
            id: Math.random().toString(36).slice(2),
            event: event as NotificationEvent,
            read: false,
          };

          setEvents((prev) => [stored, ...prev].slice(0, 30));

          if (event.type === "inbox_new") {
            setInboxUnread((n) => n + 1);
          }

          // Toast notification
          const title = eventTitle(event as NotificationEvent);
          const body = eventBody(event as NotificationEvent);
          if (event.type === "post_failed") {
            toast.error(title, { description: body });
          } else {
            toast.success(title, { description: body });
          }
        } catch {
          // Ignore heartbeat comments or parse errors
        }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5s if not intentionally closed
        setTimeout(() => {
          if (esRef.current === es) connect();
        }, 5000);
      };
    }

    connect();

    return () => {
      esRef.current = null;
      es.close();
    };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function markAllRead() {
    setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
    setInboxUnread(0);
  }

  const totalBadge = Math.min(unread, 99);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          open ? "bg-violet-50 text-violet-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        )}
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {totalBadge}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-10 left-0 z-50 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
            <div className="flex items-center gap-2">
              {events.some((e) => !e.read) && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-violet-600 hover:text-violet-700"
                >
                  Marcar como lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Events list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Elas aparecem aqui em tempo real
                </p>
              </div>
            ) : (
              events.map((stored) => {
                const Icon = ICONS[stored.event.type];
                const iconColor = ICON_COLORS[stored.event.type];
                return (
                  <Link
                    key={stored.id}
                    href={eventLink(stored.event)}
                    onClick={() => {
                      setEvents((prev) =>
                        prev.map((e) => (e.id === stored.id ? { ...e, read: true } : e))
                      );
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                      !stored.read && "bg-violet-50/40"
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 leading-snug">
                        {eventTitle(stored.event)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 leading-snug">
                        {eventBody(stored.event)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-400 mt-0.5">
                      {timeAgo(stored.event.at)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href="/inbox"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-xs text-violet-600 hover:text-violet-700"
            >
              <span>Ver inbox completo</span>
              {inboxUnread > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                  {inboxUnread} não lida{inboxUnread !== 1 ? "s" : ""}
                </span>
              )}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
