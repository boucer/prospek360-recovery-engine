import { requireAdmin } from "@/lib/adminAuth";
import TenantFormClient from "../_components/TenantFormClient";

export default async function NewTenantPage() {
  requireAdmin();

  return <TenantFormClient mode="new" />;
}
