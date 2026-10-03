import Contact from "@/screens/Contact";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata = pageMetadata({
  title: "Contact us",
  description:
    "Talk to the Orovion team about verification, consultations, partnerships or press. A real person reads every message, and we reply within two business days.",
  path: "/contact",
});

export default function Page() {
  return (
    <>
      <JsonLd data={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])]} />
      <Contact />
    </>
  );
}
