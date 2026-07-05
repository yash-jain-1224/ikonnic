import type { Metadata } from "next";
import { AdminCustomersClient } from "@/components/admin/AdminCustomersClient";

export const metadata: Metadata = { title: "Admin – Customers | Ikonnic" };

export default function AdminCustomersPage() {
  return <AdminCustomersClient />;
}
