"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface Props {
  workspace: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: string;
  };
  isOwner: boolean;
}

function Toast({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
        type === "success"
          ? "bg-green-50 border border-green-200 text-green-700"
          : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      {type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

export function WorkspaceClient({ workspace, isOwner }: Props) {
  const router = useRouter();

  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (slug === workspace.slug) {
      setSlug(val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 50));
    }
  }

  async function saveWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", message: data.error });
      } else {
        setStatus({ type: "success", message: "Workspace atualizado com sucesso." });
        router.refresh();
      }
    } catch {
      setStatus({ type: "error", message: "Erro de conexão. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkspace() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Erro ao deletar workspace.");
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Informações do workspace"
        description={isOwner ? undefined : "Apenas o dono do workspace pode editar essas informações."}
      >
        <form onSubmit={saveWorkspace} className="space-y-4">
          {status && <Toast type={status.type} message={status.message} />}
          <div>
            <Label htmlFor="ws-name">Nome</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1"
              required
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label htmlFor="ws-slug">Slug</Label>
            <div className="mt-1 flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
              <span className="px-3 py-2 bg-gray-50 text-sm text-gray-400 border-r border-gray-200 whitespace-nowrap">
                social.mibtecno.com.br/
              </span>
              <input
                id="ws-slug"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                className="flex-1 px-3 py-2 text-sm outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                required
                minLength={2}
                maxLength={50}
                pattern="[a-z0-9-]+"
                disabled={!isOwner}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Apenas letras minúsculas, números e hífens.</p>
          </div>
          {isOwner && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Danger zone — apenas o dono pode deletar o workspace */}
      {isOwner && (
        <Card title="Zona de perigo" description="Ações irreversíveis para este workspace.">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-red-700">Deletar workspace</p>
              <p className="text-xs text-red-500 mt-0.5">
                Todos os posts, contas sociais e membros serão permanentemente removidos. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div>
              <Label htmlFor="delete-confirm" className="text-xs text-red-600">
                Digite <strong>{workspace.name}</strong> para confirmar:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="mt-1 border-red-200 focus-visible:ring-red-400"
                placeholder={workspace.name}
              />
            </div>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== workspace.name || deleting}
              onClick={deleteWorkspace}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deletando..." : "Deletar workspace"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
