import Terms from "@/screens/legal/Terms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description:
    "Orovion's Terms of Use: eligibility, user roles, professional verification, content standards, payments, intellectual property, account deletion, and governing law.",
  path: "/terms",
});

export default function Page() {
  return <Terms />;
}
