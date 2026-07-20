"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Crown, Shield, User, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "ADMIN" | "MEMBER";
  joinedAt: string;
}

interface Props {
  workspaceId: string;
  isOwner: boolean;
  owner: { id: string; name: string; email: string; image: string | null };
  initialMembers: Member[];
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
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

function Avatar({ name, image, size = "md" }: { name: string; image: string | null; size?: "sm" | "md" }) {
  const initials = name.slice(0, 2).toUpperCase() || "??";
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return image ? (
    <img src={image} alt={name} className={cn(cls, "rounded-full object-cover")} />
  ) : (
    <div className={cn(cls, "rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-600")}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: "OWNER" | "ADMIN" | "MEMBER" }) {
  const map = {
    OWNER: { label: "Dono", icon: Crown, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    ADMIN: { label: "Admin", icon: Shield, cls: "bg-blue-50 text-blue-700 border-blue-200" },
    MEMBER: { label: "Membro", icon: User, cls: "bg-gray-50 text-gray-600 border-gray-200" },
  };
  const { label, icon: Icon, cls } = map[role];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function MembersClient({ workspaceId, isOwner, owner, initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteStatus, setInviteStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteStatus(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteStatus({ type: "error", message: data.error });
      } else {
        setInviteStatus({ type: "success", message: `${inviteEmail} adicionado ao workspace.` });
        setInviteEmail("");
        setMembers((prev) => [
          ...prev,
          {
            id: data.member.user.id,
            name: data.member.user.name ?? "",
            email: data.member.user.email ?? "",
            image: data.member.user.image ?? null,
            role: data.member.role,
            joinedAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setInviteStatus({ type: "error", message: "Erro de conexão. Tente novamente." });
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== userId));
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function updateRole(userId: string, role: "ADMIN" | "MEMBER") {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, role } : m)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite */}
      {isOwner && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Adicionar membro</h2>
            <p className="text-xs text-gray-400 mt-0.5">O usuário deve já ter uma conta no SocialPost.</p>
          </div>
          <div className="px-6 py-5">
            <form onSubmit={invite} className="space-y-4">
              {inviteStatus && <Toast type={inviteStatus.type} message={inviteStatus.message} />}
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="invite-email">Email do usuário</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="invite-role">Função</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                    className="mt-1 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={inviting} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                  <UserPlus className="h-4 w-4" />
                  {inviting ? "Adicionando..." : "Adicionar membro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Membros</h2>
          <span className="text-xs text-gray-400">{members.length + 1} pessoa{members.length !== 0 && "s"}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Owner row */}
          <div className="flex items-center gap-4 px-6 py-4">
            <Avatar name={owner.name || owner.email} image={owner.image} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{owner.name || "Sem nome"}</p>
              <p className="text-xs text-gray-400 truncate">{owner.email}</p>
            </div>
            <RoleBadge role="OWNER" />
          </div>

          {/* Members */}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-4">
              <Avatar name={m.name || m.email} image={m.image} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{m.name || "Sem nome"}</p>
                <p className="text-xs text-gray-400 truncate">{m.email}</p>
              </div>
              {isOwner ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => updateRole(m.id, e.target.value as "ADMIN" | "MEMBER")}
                    disabled={updatingId === m.id}
                    className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  >
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.id)}
                    disabled={removingId === m.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Remover membro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <RoleBadge role={m.role} />
              )}
            </div>
          ))}

          {members.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Nenhum membro além de você. Convide alguém acima.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
