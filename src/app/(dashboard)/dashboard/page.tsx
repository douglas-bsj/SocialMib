import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceAccessWhere } from "@/lib/workspace";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  TrendingUp,
  Users,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await db.workspace.findFirst({
    where: workspaceAccessWhere(session.user.id),
    include: {
      socialAccounts: true,
      posts: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { socialAccounts: { include: { socialAccount: true } } },
      },
    },
  });

  if (!workspace) redirect("/onboarding");

  const stats = {
    totalAccounts: workspace.socialAccounts.length,
    scheduled: workspace.posts.filter((p) => p.status === "SCHEDULED").length,
    published: workspace.posts.filter((p) => p.status === "PUBLISHED").length,
    failed: workspace.posts.filter((p) => p.status === "FAILED").length,
  };

  const statusConfig = {
    DRAFT: { label: "Rascunho", variant: "secondary" as const },
    PENDING: { label: "Pendente", variant: "warning" as const },
    SCHEDULED: { label: "Agendado", variant: "default" as const },
    PUBLISHED: { label: "Publicado", variant: "success" as const },
    FAILED: { label: "Falhou", variant: "destructive" as const },
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aqui está o resumo do seu workspace
          </p>
        </div>
        <Link href="/publish">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Contas conectadas</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.totalAccounts}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Agendados</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.scheduled}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Publicados</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.published}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Com falha</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.failed}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent posts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Posts recentes</CardTitle>
              <Link href="/schedule">
                <Button variant="ghost" size="sm" className="text-violet-600">
                  Ver todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {workspace.posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Send className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Nenhum post ainda
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Crie seu primeiro post agendado
                  </p>
                  <Link href="/publish" className="mt-4">
                    <Button size="sm">Criar post</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {workspace.posts.map((post) => {
                    const status = statusConfig[post.status];
                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {post.scheduledAt && (
                              <span className="text-xs text-gray-400">
                                {formatDate(post.scheduledAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connected accounts */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contas conectadas</CardTitle>
              <Link href="/accounts">
                <Button variant="ghost" size="sm" className="text-violet-600">
                  Gerenciar
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {workspace.socialAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Nenhuma conta conectada
                  </p>
                  <Link href="/accounts" className="mt-3">
                    <Button size="sm" variant="outline">
                      Conectar conta
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {workspace.socialAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                        {account.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {account.name}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {account.platform.toLowerCase()}
                        </p>
                      </div>
                      <div
                        className={`h-2 w-2 rounded-full ${account.isActive ? "bg-green-400" : "bg-gray-300"}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
