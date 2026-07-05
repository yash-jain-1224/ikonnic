import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";

export const metadata: Metadata = { title: "Terms & Conditions" };
export default function TermsPage() { return <PolicyPage policyKey="terms-conditions" />; }
