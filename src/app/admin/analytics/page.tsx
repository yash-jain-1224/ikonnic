import type { Metadata } from "next";
import { AdminAnalyticsClient } from "@/components/admin/AdminAnalyticsClient";

export const metadata: Metadata = { title: "Admin – Analytics | Ikonnic" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
