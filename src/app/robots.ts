import type { MetadataRoute } from "next";
import { isPublicRegistrationOpen } from "@/lib/registration";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://social.mibtecno.com.br";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          ...(isPublicRegistrationOpen() ? ["/register"] : []),
          "/forgot-password",
        ],
        disallow: [
          "/dashboard",
          "/publish",
          "/accounts",
          "/schedule",
          "/inbox",
          "/analytics",
          "/settings",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
