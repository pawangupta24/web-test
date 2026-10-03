import type { Metadata } from "next";
import Login from "@/screens/Login";

// A sign-in form has no search value and would compete with the home page for
// the brand query, so it is kept out of the index (robots.txt disallows it too).
export const metadata: Metadata = {
  title: "Sign in — Orovion",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <Login />;
}
