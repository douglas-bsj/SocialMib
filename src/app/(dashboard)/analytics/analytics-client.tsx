"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Overview {
  totalPublished: number;
  totalFailed: number;
  totalScheduled: number;
  totalAccounts: number;
  successRate: number;
}

interface Props {
  overview: Overview;
  postsOverTime: Array<{ date: string; published: number; failed: number }>;
  byPlatform: Array<{ platform: string; count: number }>;
  recentPosts: Array<{
    id: string;
    content: string;
    publishedAt: string | null;
    platforms: string[];
  }>;
}

const PLATFORM_COLORS: Record<string, string> = {
  "Twitter / X": "#1DA1F2",
  Instagram: "#E1306C",
  Facebook: "#1877F2",
  LinkedIn: "#0A66C2",
  TikTok: "#FE2C55",
  YouTube: "#FF0000",
  Pinterest: "#BD081C",
  Reddit: "#FF4500",
  Bluesky: "#0085FF",
  Threads: "#7856FF",
};

const PIE_COLORS = [
  "#7C3AED",
  "#2563EB",
  "#0891B2",
  "#059669",
  "#D97706",
  "#DC2626",
  "#DB2777",
  "#7C3AED",
  "#4F46E5",
  "#0284C7",
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function platformShort(p: string) {
  const map: Record<string, string> = {
    TWITTER: "X",
    INSTAGRAM: "IG",
    FACEBOOK: "FB",
    LINKEDIN: "LI",
    TIKTOK: "TT",
    YOUTUBE: "YT",
    PINTEREST: "PI",
    REDDIT: "RE",
    BLUESKY: "BS",
    THREADS: "TH",
  };
  return map[p] ?? p.slice(0, 2);
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
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
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold",
        colors[platform] ?? "bg-gray-100 text-gray-600"
      )}
    >
      {platformShort(platform)}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function AnalyticsClient({ overview, postsOverTime, byPlatform, recentPosts }: Props) {
  const hasTimeData = postsOverTime.some((d) => d.published > 0 || d.failed > 0);
  const hasPlatformData = byPlatform.length > 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Desempenho dos últimos 30 dias.</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-8">
        <StatCard
          icon={CheckCircle2}
          label="Publicados"
          value={overview.totalPublished}
          sub="total"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={XCircle}
          label="Com falha"
          value={overview.totalFailed}
          sub="total"
          color="bg-red-50 text-red-500"
        />
        <StatCard
          icon={Clock}
          label="Agendados"
          value={overview.totalScheduled}
          sub="próximos"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Users}
          label="Contas ativas"
          value={overview.totalAccounts}
          sub="conectadas"
          color="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de sucesso"
          value={`${overview.successRate}%`}
          sub="publicados / total"
          color="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Posts over time */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Posts por dia — últimos 30 dias</h2>
          </div>
          {hasTimeData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={postsOverTime} barSize={6} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  cursor={{ fill: "#F9FAFB" }}
                />
                <Bar dataKey="published" name="Publicados" fill="#7C3AED" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed" name="Falhas" fill="#FCA5A5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Nenhum post nos últimos 30 dias
            </div>
          )}
        </div>

        {/* By platform */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Por plataforma</h2>
          </div>
          {hasPlatformData ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={byPlatform}
                    dataKey="count"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {byPlatform.map((entry, i) => (
                      <Cell
                        key={entry.platform}
                        fill={PLATFORM_COLORS[entry.platform] ?? PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E5E7EB",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {byPlatform.slice(0, 5).map((p, i) => (
                  <div key={p.platform} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            PLATFORM_COLORS[p.platform] ?? PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="text-gray-600">{p.platform}</span>
                    </div>
                    <span className="font-semibold text-gray-800 tabular-nums">{p.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Nenhum post publicado ainda
            </div>
          )}
        </div>
      </div>

      {/* Recent published posts */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Posts publicados recentemente</h2>
        </div>
        {recentPosts.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            Nenhum post publicado ainda. Publique seu primeiro post em{" "}
            <a href="/publish" className="text-violet-600 hover:underline">
              Publicar
            </a>
            .
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(post.publishedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {post.platforms.map((p) => (
                    <PlatformBadge key={p} platform={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
