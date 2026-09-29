import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/teacher", "/student/dashboard", "/student/quiz", "/student/result"] }, sitemap: `${base}/sitemap.xml` };
}
