import type { Metadata } from "next";
import { AdminInventoryClient } from "@/components/admin/AdminInventoryClient";

export const metadata: Metadata = { title: "Admin – Inventory | Ikonnic" };

export default function AdminInventoryPage() {
  return <AdminInventoryClient />;
}
