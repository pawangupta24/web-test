import TeamPage from "@/screens/TeamPage";
import JsonLd from "@/components/seo/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { personSchema, breadcrumbSchema } from "@/lib/schema";
import { TEAM } from "@/lib/team";

export const metadata = pageMetadata({
  title: "Meet the team",
  description:
    "The clinicians and engineers building Orovion: a license-verified network for cases, research, pulses and real-time consults.",
  path: "/team",
});

export default function Page() {
  return (
    <>
      {/* Every founder is described here as well as on their own page; the
          shared @id means Google merges them into one Person entity. */}
      <JsonLd data={[...TEAM.map(personSchema), breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Team", path: "/team" }])]} />
      <TeamPage />
    </>
  );
}
