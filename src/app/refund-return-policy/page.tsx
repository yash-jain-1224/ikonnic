import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";

export const metadata: Metadata = { title: "Refund & Return Policy" };
export default function RefundPage() { return <PolicyPage policyKey="refund-return-policy" />; }
