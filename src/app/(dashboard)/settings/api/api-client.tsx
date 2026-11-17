"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Bot, Check, Copy, KeyRound, Trash2, TriangleAlert } from "lucide-react";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

function formatDate(iso: string | null) {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  }
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>}
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg bg-gray-900 px-4 py-3 pr-12 text-xs leading-relaxed text-gray-100">
          {text}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="absolute right-2 top-2 rounded-md bg-gray-700 p-1.5 text-gray-200 hover:bg-gray-600"
          title="Copiar"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

const TABS = ["Hermes", "Claude Code", "Claude Desktop / outros", "Só URL"] as const;

export function ApiClient({ canManage, mcpUrl }: { canManage: boolean; mcpUrl: string }) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Hermes");

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => setError("Erro ao carregar as chaves."))
      .finally(() => setLoading(false));
  }, [canManage]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a chave.");
        return;
      }
      setNewKey(data.key);
      setName("");
      setKeys((prev) => [
        { ...data.apiKey, lastUsedAt: null, user: { name: "Você", email: "" } },
        ...prev,
      ]);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revogar esta chave? A IA que usa ela perde o acesso na hora.")) return;
    setRevokingId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setRevokingId(null);
    }
  }

  const keyForSnippet = newKey ?? "SUA_CHAVE_AQUI";
  const snippets: Record<(typeof TABS)[number], { text: string; help: string }> = {
    Hermes: {
      help: "No arquivo de configuração do Hermes (config.yaml), acrescente o servidor MCP abaixo e reinicie o Hermes.",
      text: `mcp_servers:\n  mibsocial:\n    url: "${mcpUrl}"\n    headers:\n      Authorization: "Bearer ${keyForSnippet}"`,
    },
    "Claude Code": {
      help: "Rode este comando no terminal:",
      text: `claude mcp add --transport http mibsocial ${mcpUrl} \\\n  --header "Authorization: Bearer ${keyForSnippet}"`,
    },
    "Claude Desktop / outros": {
      help: "Para apps que usam o arquivo de configuração MCP (ex.: claude_desktop_config.json, Cursor, Windsurf). Requer Node.js instalado.",
      text: JSON.stringify(
        {
          mcpServers: {
            mibsocial: {
              command: "npx",
              args: ["-y", "mcp-remote", mcpUrl, "--header", `Authorization: Bearer ${keyForSnippet}`],
            },
          },
        },
        null,
        2
      ),
    },
    "Só URL": {
      help: "Para ferramentas que só pedem uma URL (sem campo de cabeçalho). Atenção: a chave fica visível na URL — use só em ferramentas de confiança.",
      text: `${mcpUrl}?key=${keyForSnippet}`,
    },
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex gap-3">
          <Bot className="h-5 w-5 shrink-0 text-violet-600" />
          <div className="text-sm text-violet-900">
            <p className="font-semibold">Conecte sua IA ao Mib Social</p>
            <p className="mt-1">
              Agentes de IA compatíveis com <strong>MCP</strong> (Hermes, Claude, Cursor e outros) podem ver suas
              contas, criar e agendar posts, ler a Inbox e consultar o Analytics — tudo com as mesmas regras do site.
            </p>
            <div className="mt-3">
              <CopyBlock text={mcpUrl} label="Endereço do servidor MCP" />
            </div>
          </div>
        </div>
      </div>

      {!canManage ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Apenas o dono ou um admin do workspace podem criar chaves de API. Peça a um deles.
        </div>
      ) : (
        <>
          {/* Criar chave */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Criar chave de API</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                A chave dá acesso total a este workspace. Crie uma por IA, para poder revogar separadamente.
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}

              {newKey && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <TriangleAlert className="h-4 w-4" />
                    Copie a chave agora — ela não será mostrada de novo.
                  </p>
                  <CopyBlock text={newKey} />
                  <button
                    type="button"
                    onClick={() => setNewKey(null)}
                    className="text-xs text-amber-700 underline hover:text-amber-900"
                  >
                    Já copiei, esconder
                  </button>
                </div>
              )}

              <form onSubmit={create} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="key-name">Nome da chave</Label>
                  <Input
                    id="key-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Hermes do Felipe"
                    className="mt-1"
                    required
                    minLength={2}
                    maxLength={60}
                  />
                </div>
                <Button type="submit" disabled={creating} className="gap-2 bg-violet-600 text-white hover:bg-violet-700">
                  <KeyRound className="h-4 w-4" />
                  {creating ? "Criando..." : "Criar chave"}
                </Button>
              </form>
            </div>
          </div>

          {/* Chaves ativas */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Chaves ativas</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-6 py-6 text-sm text-gray-400">Carregando...</div>
              ) : keys.length === 0 ? (
                <div className="px-6 py-6 text-center text-sm text-gray-400">Nenhuma chave criada ainda.</div>
              ) : (
                keys.map((k) => (
                  <div key={k.id} className="flex items-center gap-4 px-6 py-4">
                    <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{k.name}</p>
                      <p className="text-xs text-gray-400">
                        <code>{k.prefix}…</code> · criada em {formatDate(k.createdAt)} por {k.user.name || k.user.email} ·
                        último uso: {formatDate(k.lastUsedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => revoke(k.id)}
                      disabled={revokingId === k.id}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title="Revogar chave"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Como conectar */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Como conectar</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {newKey ? "Os exemplos abaixo já estão com a sua chave nova." : "Troque SUA_CHAVE_AQUI pela chave criada acima."}
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4 flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mb-2 text-sm text-gray-600">{snippets[tab].help}</p>
          <CopyBlock text={snippets[tab].text} />

          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            <p className="mb-1 font-medium text-gray-700">O que a IA consegue fazer</p>
            <p>
              Ver o workspace e a equipe · listar e ativar/desativar contas · criar, editar, agendar, publicar,
              reenviar e excluir posts · enviar imagens por URL · ler, atualizar e marcar a Inbox · consultar o
              Analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
