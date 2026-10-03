import { PublicUnavailable } from "@/components/public/PublicPreview";

// Served with HTTP 404 for anything api-service won't show a signed-out visitor.
// Private, removed and never-existed look the same on purpose.
export default function NotFound() {
  return <PublicUnavailable />;
}
