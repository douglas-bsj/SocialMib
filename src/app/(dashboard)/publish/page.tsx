"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Send, Clock, Image as ImageIcon, Smile, Hash, AlertCircle,
  Sparkles, Wand2, RefreshCw, X, ArrowLeft, Plus, Loader2,
} from "lucide-react";
import { MAX_IMAGES_PER_POST } from "@/lib/storage-constants";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  TWITTER: <span className="text-black font-bold">𝕏</span>,
  INSTAGRAM: <span>📸</span>,
  FACEBOOK: <span className="text-blue-600 font-bold">f</span>,
  LINKEDIN: <span className="text-blue-700 font-bold text-xs">in</span>,
  TIKTOK: <span>♪</span>,
  YOUTUBE: <span className="text-red-600">▶</span>,
  PINTEREST: <span className="text-red-500 font-bold">P</span>,
  BLUESKY: <span>🦋</span>,
  THREADS: <span>@</span>,
  REDDIT: <span className="text-orange-600">🤖</span>,
};

const PLATFORM_LIMITS: Record<string, number> = {
  TWITTER: 280,
  INSTAGRAM: 2200,
  FACEBOOK: 63206,
  LINKEDIN: 3000,
  TIKTOK: 2200,
  YOUTUBE: 5000,
  PINTEREST: 500,
  BLUESKY: 300,
  THREADS: 500,
  REDDIT: 40000,
};

interface SocialAccount {
  id: string;
  platform: string;
  name: string;
  username?: string;
}

type Tone = "casual" | "professional" | "humorous" | "inspirational";

const TONE_LABELS: Record<Tone, string> = {
  casual: "Casual",
  professional: "Profissional",
  humorous: "Bem-humorado",
  inspirational: "Inspiracional",
};

function PublishPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("edit");
  const presetDate = searchParams.get("scheduledAt");

  const [content, setContent] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [scheduleMode, setScheduleMode] = useState(!!presetDate);
  const [scheduledAt, setScheduledAt] = useState(presetDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [variations, setVariations] = useState<Record<string, string>>({});
  const [useVariations, setUseVariations] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState<Tone>("casual");
  const [aiGenerateVariations, setAiGenerateVariations] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []));
  }, []);

  useEffect(() => {
    if (!editId) return;

    async function loadPost() {
      setLoadingEdit(true);
      try {
        const res = await fetch(`/api/posts/${editId}`);
        if (!res.ok) return;
        const { post } = await res.json();

        setContent(post.content ?? "");

        const accountIds = (post.socialAccounts ?? []).map(
          (psa: { socialAccount: { id: string } }) => psa.socialAccount.id
        );
        setSelectedAccounts(accountIds);

        if (post.scheduledAt) {
          setScheduleMode(true);
          // Convert to local datetime-local format
          const d = new Date(post.scheduledAt);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setScheduledAt(local);
        }

        if (post.variations && post.variations.length > 0) {
          const varMap: Record<string, string> = {};
          for (const v of post.variations) {
            varMap[v.platform] = v.content;
          }
          setVariations(varMap);
          setUseVariations(true);
        }

        if (post.images && post.images.length > 0) {
          setImages(post.images);
        }
      } finally {
        setLoadingEdit(false);
      }
    }

    loadPost();
  }, [editId]);

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = MAX_IMAGES_PER_POST - images.length;
    if (remaining <= 0) {
      setUploadError(`Máximo de ${MAX_IMAGES_PER_POST} imagens por post.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingImages(true);
    setUploadError("");

    const uploaded: string[] = [];
    for (const file of toUpload) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? "Erro ao fazer upload.");
          break;
        }
        uploaded.push(data.url);
      } catch {
        setUploadError("Erro de rede ao fazer upload.");
        break;
      }
    }

    setImages((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES_PER_POST));
    setUploadingImages(false);
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  function toggleAccount(id: string) {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  function getContentForPlatform(platform: string) {
    if (useVariations && variations[platform]) return variations[platform];
    return content;
  }

  function getCharCount(platform: string) {
    const text = getContentForPlatform(platform);
    const limit = PLATFORM_LIMITS[platform] ?? 500;
    return { count: text.length, limit, pct: Math.min(100, (text.length / limit) * 100) };
  }

  async function generateWithAI() {
    if (!aiTopic.trim()) {
      setAiError("Descreva o tema do post.");
      return;
    }
    if (selectedAccounts.length === 0) {
      setAiError("Selecione pelo menos uma conta antes de gerar.");
      return;
    }

    setAiLoading(true);
    setAiError("");

    const platforms = accounts
      .filter((a) => selectedAccounts.includes(a.id))
      .map((a) => a.platform);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          platforms,
          tone: aiTone,
          language: "pt-BR",
          generateVariations: aiGenerateVariations && platforms.length > 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error ?? "Erro ao gerar conteúdo.");
        return;
      }

      setContent(data.content);
      if (aiGenerateVariations && Object.keys(data.variations ?? {}).length > 0) {
        setVariations(data.variations);
        setUseVariations(true);
      }

      setAiOpen(false);
      setAiTopic("");
    } catch {
      setAiError("Erro de rede. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(draft = false) {
    if (!content.trim()) {
      setError("O conteúdo do post não pode estar vazio.");
      return;
    }
    if (selectedAccounts.length === 0) {
      setError("Selecione pelo menos uma conta.");
      return;
    }
    if (scheduleMode && !scheduledAt) {
      setError("Defina a data e hora de agendamento.");
      return;
    }

    setError("");
    setSubmitting(true);

    const status = draft ? "DRAFT" : scheduleMode ? "SCHEDULED" : "PENDING";
    const body = {
      content,
      selectedAccounts,
      scheduledAt: scheduleMode ? scheduledAt : null,
      status,
      variations: useVariations ? variations : {},
      images,
    };

    try {
      const res = editId
        ? await fetch(`/api/posts/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar post.");
        return;
      }

      setSuccess(true);
      if (editId) {
        setTimeout(() => router.push("/schedule"), 1500);
      } else {
        setContent("");
        setSelectedAccounts([]);
        setScheduledAt("");
        setVariations({});
        setUseVariations(false);
        setImages([]);
        setUploadError("");
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedPlatforms = accounts
    .filter((a) => selectedAccounts.includes(a.id))
    .map((a) => a.platform);

  if (loadingEdit) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Composer */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            {editId && (
              <Link href="/schedule">
                <Button variant="ghost" size="icon" className="mt-0.5 text-gray-400 hover:text-gray-700">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editId ? "Editar Post" : "Criar Post"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {editId
                  ? "Edite o conteúdo e as configurações do post"
                  : "Crie e agende publicações para suas redes sociais"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAiOpen(true)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:from-violet-500 hover:to-indigo-500"
          >
            <Sparkles className="h-4 w-4" />
            Gerar com IA
          </Button>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <span>✅</span>
            {editId ? "Post atualizado! Redirecionando..." : `Post ${scheduleMode ? "agendado" : "criado"} com sucesso!`}
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Account selector */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Publicar em ({selectedAccounts.length} selecionadas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma conta conectada.{" "}
                <a href="/accounts" className="text-violet-600 underline">
                  Conectar agora
                </a>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => {
                  const selected = selectedAccounts.includes(account.id);
                  return (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                        selected
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-base">
                        {PLATFORM_ICONS[account.platform] ?? "📱"}
                      </span>
                      <span className="font-medium">{account.name}</span>
                      {selected && <span className="text-violet-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            {useVariations && selectedPlatforms.length > 0 ? (
              <Tabs defaultValue={selectedPlatforms[0]}>
                <div className="mb-3 flex items-center justify-between">
                  <TabsList>
                    {selectedPlatforms.map((p) => (
                      <TabsTrigger key={p} value={p} className="gap-1.5">
                        {PLATFORM_ICONS[p]}
                        <span className="text-xs capitalize">{p.toLowerCase()}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <button
                    onClick={() => { setUseVariations(false); setVariations({}); }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Usar conteúdo único
                  </button>
                </div>
                {selectedPlatforms.map((platform) => {
                  const { count, limit, pct } = getCharCount(platform);
                  return (
                    <TabsContent key={platform} value={platform}>
                      <Textarea
                        placeholder={`Conteúdo para ${platform.toLowerCase()}...`}
                        value={variations[platform] ?? content}
                        onChange={(e) =>
                          setVariations((v) => ({ ...v, [platform]: e.target.value }))
                        }
                        rows={7}
                        className="text-sm"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-xs ${count > limit ? "text-red-500" : "text-gray-400"}`}>
                          {count}/{limit}
                        </span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-400" : pct > 70 ? "bg-amber-400" : "bg-violet-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <>
                <Textarea
                  placeholder="O que você quer publicar hoje?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="text-sm border-0 shadow-none focus-visible:ring-0 resize-none p-0"
                />
                {/* Image grid */}
                {images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {images.map((url) => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES_PER_POST && (
                      <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-300 hover:border-violet-300 hover:text-violet-400 transition-colors">
                        {uploadingImages ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(e) => handleImageFiles(e.target.files)}
                        />
                      </label>
                    )}
                  </div>
                )}

                {uploadError && (
                  <p className="mt-2 text-xs text-red-600">{uploadError}</p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex gap-1">
                    <label className="relative cursor-pointer">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-violet-600"
                        disabled={uploadingImages || images.length >= MAX_IMAGES_PER_POST}
                        asChild
                      >
                        <span>
                          {uploadingImages ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        className="sr-only"
                        disabled={uploadingImages || images.length >= MAX_IMAGES_PER_POST}
                        onChange={(e) => handleImageFiles(e.target.files)}
                      />
                    </label>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                      <Hash className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    {images.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {images.length}/{MAX_IMAGES_PER_POST} imagens
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{content.length} caracteres</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch id="schedule" checked={scheduleMode} onCheckedChange={setScheduleMode} />
            <Label htmlFor="schedule" className="cursor-pointer">Agendar para depois</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="variations" checked={useVariations} onCheckedChange={setUseVariations} />
            <Label htmlFor="variations" className="cursor-pointer">Conteúdo por plataforma</Label>
          </div>
        </div>

        {scheduleMode && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <Label className="mb-2 block">Data e hora</Label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {editId ? (
            <>
              <Link href="/schedule">
                <Button variant="outline" disabled={submitting}>Cancelar</Button>
              </Link>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="gap-2">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                Salvar alterações
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
                Salvar rascunho
              </Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="gap-2">
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : scheduleMode ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {scheduleMode ? "Agendar post" : "Publicar agora"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview sidebar */}
      <div className="hidden w-80 border-l border-gray-200 bg-white overflow-y-auto p-6 xl:block">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Preview</h2>
        {selectedPlatforms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-3xl mb-3">👀</div>
            <p className="text-sm text-gray-400">Selecione contas para ver o preview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedPlatforms.map((platform) => {
              const account = accounts.find(
                (a) => a.platform === platform && selectedAccounts.includes(a.id)
              );
              const text = getContentForPlatform(platform);
              const { count, limit } = getCharCount(platform);
              return (
                <div key={platform} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <span className="text-sm">{PLATFORM_ICONS[platform]}</span>
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {platform.toLowerCase()}
                    </span>
                    {count > limit && (
                      <Badge variant="destructive" className="ml-auto text-xs">Limite excedido</Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {account?.name?.[0] ?? "U"}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{account?.name ?? "Conta"}</p>
                        {account?.username && (
                          <p className="text-xs text-gray-400">@{account.username}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {text || <span className="text-gray-300">Conteúdo aparecerá aqui...</span>}
                    </p>
                    {images.length > 0 && (
                      <div className={`mt-2 grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {images.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url}
                            src={url}
                            alt=""
                            className="w-full rounded object-cover"
                            style={{ maxHeight: images.length === 1 ? 140 : 70 }}
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-right text-xs text-gray-400">{count}/{limit}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              Gerar conteúdo com IA
            </DialogTitle>
            <DialogDescription>
              Descreva o tema e a IA criará posts otimizados para cada plataforma selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            {aiError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {aiError}
              </div>
            )}

            <div>
              <Label htmlFor="ai-topic" className="mb-1.5 block">Tema ou ideia do post</Label>
              <Textarea
                id="ai-topic"
                placeholder="Ex: Lançamento do nosso novo produto, dicas de produtividade para desenvolvedores, promoção de 20% off no fim de semana..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                rows={3}
                className="text-sm resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generateWithAI();
                }}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Tom de voz</Label>
              <Select value={aiTone} onValueChange={(v) => setAiTone(v as Tone)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TONE_LABELS) as [Tone, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlatforms.length > 1 && (
              <div className="flex items-center gap-2 rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5">
                <Switch
                  id="ai-variations"
                  checked={aiGenerateVariations}
                  onCheckedChange={setAiGenerateVariations}
                  className="data-[state=checked]:bg-violet-600"
                />
                <div>
                  <Label htmlFor="ai-variations" className="cursor-pointer text-sm font-medium text-violet-800">
                    Adaptar para cada plataforma
                  </Label>
                  <p className="text-xs text-violet-600 mt-0.5">
                    Gera variações otimizadas para {selectedPlatforms.length} redes
                  </p>
                </div>
              </div>
            )}

            {selectedAccounts.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                ⚠ Selecione as contas antes de gerar para adaptar o conteúdo às plataformas.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAiOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                onClick={generateWithAI}
                disabled={aiLoading || !aiTopic.trim()}
              >
                {aiLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {aiLoading ? "Gerando..." : "Gerar conteúdo"}
              </Button>
            </div>
            <p className="text-center text-xs text-gray-400">⌘ + Enter para gerar</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    }>
      <PublishPageInner />
    </Suspense>
  );
}
