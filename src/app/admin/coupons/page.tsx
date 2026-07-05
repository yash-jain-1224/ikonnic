import type { Metadata } from "next";
import { AdminCouponsClient } from "@/components/admin/AdminCouponsClient";

export const metadata: Metadata = { title: "Admin – Coupons | Ikonnic" };

export default function AdminCouponsPage() {
  return <AdminCouponsClient />;
}
