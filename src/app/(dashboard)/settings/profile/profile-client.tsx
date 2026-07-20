"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, User } from "lucide-react";

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    hasPassword: boolean;
    createdAt: string;
  };
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

export function ProfileClient({ user }: Props) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwStatus, setPwStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileStatus({ type: "error", message: data.error });
      } else {
        setProfileStatus({ type: "success", message: "Perfil atualizado com sucesso." });
        router.refresh();
      }
    } catch {
      setProfileStatus({ type: "error", message: "Erro de conexão. Tente novamente." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (nextPw !== confirmPw) {
      setPwStatus({ type: "error", message: "As senhas não coincidem." });
      return;
    }
    setSavingPw(true);
    setPwStatus(null);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: currentPw, next: nextPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwStatus({ type: "error", message: data.error });
      } else {
        setPwStatus({ type: "success", message: "Senha alterada com sucesso." });
        setCurrentPw("");
        setNextPw("");
        setConfirmPw("");
      }
    } catch {
      setPwStatus({ type: "error", message: "Erro de conexão. Tente novamente." });
    } finally {
      setSavingPw(false);
    }
  }

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card title="Foto de perfil">
        <div className="flex items-center gap-4">
          {user.image ? (
            <img src={user.image} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-xl font-semibold text-violet-600">{initials}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">{user.name || "Sem nome"}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Membro desde{" "}
              {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(user.createdAt))}
            </p>
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card title="Informações pessoais">
        <form onSubmit={saveProfile} className="space-y-4">
          {profileStatus && <Toast type={profileStatus.type} message={profileStatus.message} />}
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile} className="bg-violet-600 hover:bg-violet-700 text-white">
              {savingProfile ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Password */}
      {user.hasPassword && (
        <Card title="Alterar senha">
          <form onSubmit={changePassword} className="space-y-4">
            {pwStatus && <Toast type={pwStatus.type} message={pwStatus.message} />}
            <div>
              <Label htmlFor="current-pw">Senha atual</Label>
              <Input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="next-pw">Nova senha</Label>
              <Input
                id="next-pw"
                type="password"
                value={nextPw}
                onChange={(e) => setNextPw(e.target.value)}
                className="mt-1"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="confirm-pw">Confirmar nova senha</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPw} className="bg-violet-600 hover:bg-violet-700 text-white">
                {savingPw ? "Alterando..." : "Alterar senha"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!user.hasPassword && (
        <Card title="Senha">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <User className="h-4 w-4" />
            <span>Sua conta foi criada via OAuth (Google). Não há senha para alterar.</span>
          </div>
        </Card>
      )}
    </div>
  );
}
