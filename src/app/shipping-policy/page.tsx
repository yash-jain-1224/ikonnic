import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";

export const metadata: Metadata = { title: "Shipping Policy" };
export default function ShippingPolicyPage() { return <PolicyPage policyKey="shipping-policy" />; }
