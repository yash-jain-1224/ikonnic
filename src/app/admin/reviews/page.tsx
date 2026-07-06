import type { Metadata } from "next";
import { AdminReviewsClient } from "@/components/admin/AdminReviewsClient";

export const metadata: Metadata = { title: "Admin – Reviews | Ikonnic" };

export default function AdminReviewsPage() {
  return <AdminReviewsClient />;
}
