import HelpCenter from "@/screens/legal/HelpCenter";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { faqPageSchema, breadcrumbSchema } from "@/lib/schema";
import { ALL_FAQ_ITEMS } from "@/lib/faq";

export const metadata = pageMetadata({
  title: "Help center",
  description:
    "Answers about Orovion accounts, verification, the home feed, posts and comments, consultations, payments, and safety tools.",
  path: "/help",
});

export default function Page() {
  return (
    <>
      {/* Built from the same `src/lib/faq.ts` the accordion renders, so the
          markup always matches the visible copy — Google's hard requirement
          for the FAQ rich result. */}
      <JsonLd data={[faqPageSchema(ALL_FAQ_ITEMS), breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Help", path: "/help" }])]} />
      <HelpCenter />
    </>
  );
}
