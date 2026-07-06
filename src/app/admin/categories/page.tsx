import type { Metadata } from "next";
import { AdminCategoriesClient } from "@/components/admin/AdminCategoriesClient";

export const metadata: Metadata = { title: "Admin – Categories | Ikonnic" };

export default function AdminCategoriesPage() {
  return <AdminCategoriesClient />;
}
