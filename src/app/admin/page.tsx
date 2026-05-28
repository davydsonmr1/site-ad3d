import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { readContent } from "@/lib/content";
import { assetUrl } from "@/lib/asset-token";
import AdminDashboard from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const content = await readContent();

  // Pre-sign every image path currently in use so the editor can show previews.
  const previews: Record<string, string> = {};
  const collect = (p: string) => {
    if (p && !previews[p]) previews[p] = assetUrl(p, 600);
  };
  collect(content.hero.backgroundImage);
  collect(content.hero.foregroundImage);
  for (const s of content.sections) {
    if (s.type === "carousel") s.items.forEach((it) => collect(it.image));
  }

  return <AdminDashboard initialContent={content} initialPreviews={previews} />;
}
