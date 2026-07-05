import type { Metadata } from "next";
import { AdminProductsClient } from "@/components/admin/AdminProductsClient";

export const metadata: Metadata = { title: "Admin – Products | Ikonnic" };

export default function AdminProductsPage() {
  return <AdminProductsClient />;
}
