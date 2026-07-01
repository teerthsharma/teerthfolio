import { cookies } from "next/headers";
import AdminDashboard from "../../components/AdminDashboard";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "../../lib/admin-auth";
import { readPortfolioContent } from "../../lib/portfolio-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const initialAuthenticated = verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  const initialContent = await readPortfolioContent();

  return <AdminDashboard initialAuthenticated={initialAuthenticated} initialContent={initialContent} />;
}
