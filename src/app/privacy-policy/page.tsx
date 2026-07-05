import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy" };
export default function PrivacyPage() { return <PolicyPage policyKey="privacy-policy" />; }
