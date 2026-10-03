import MobileAppPage from "@/screens/MobileAppPage";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { mobileAppSchema, breadcrumbSchema } from "@/lib/schema";

export const metadata = pageMetadata({
  title: "Get the app",
  description:
    "Orovion for iOS and Android: the verified clinical network with cases, Pulse, real-time chat and video consults, on the App Store and Google Play.",
  path: "/mobile-app",
});

export default function Page() {
  return (
    <>
      <JsonLd data={[mobileAppSchema(), breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Get the app", path: "/mobile-app" }])]} />
      <MobileAppPage />
    </>
  );
}
