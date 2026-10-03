import PrivacyPolicy from "@/screens/legal/PrivacyPolicy";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description:
    "How Orovion collects, uses, stores, shares and protects information: registration data, verification documents, payments, data retention, account deletion, and your rights.",
  path: "/privacy",
});

export default function Page() {
  return <PrivacyPolicy />;
}
