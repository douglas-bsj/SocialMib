import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, password: true, createdAt: true },
  });

  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        image: user.image ?? null,
        hasPassword: !!user.password,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
