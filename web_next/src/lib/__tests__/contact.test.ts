import { describe, it, expect } from "vitest";
import { buildContactMailto, contactEmailParts, CONTACT_EMAIL, MAX_MESSAGE_CHARS, type ContactValues } from "../contact";

const base: ContactValues = {
  name: "  Dr. Ananya Mehra ",
  email: "ananya@example.com",
  phone: "",
  role: "Doctor or specialist",
  message: "I'd like to verify my clinic & add colleagues.",
  topics: ["Account & verification", "Partnerships & institutions"],
  source: "A colleague or friend",
  updates: true,
};

describe("contactEmailParts", () => {
  it("uses the first topic and trimmed name in the subject", () => {
    expect(contactEmailParts(base).subject).toBe("Orovion enquiry: Account & verification (Dr. Ananya Mehra)");
  });

  it("falls back to a general subject without topics", () => {
    expect(contactEmailParts({ ...base, topics: [] }).subject).toBe("Orovion enquiry: General enquiry (Dr. Ananya Mehra)");
  });

  it("lists every answered field with CRLF line breaks", () => {
    const { body } = contactEmailParts(base);
    expect(body.split("\r\n")).toEqual([
      "Name: Dr. Ananya Mehra",
      "Email: ananya@example.com",
      "I am a: Doctor or specialist",
      "Topics: Account & verification, Partnerships & institutions",
      "Heard about Orovion via: A colleague or friend",
      "Product updates by email: Yes",
      "",
      "Message:",
      "I'd like to verify my clinic & add colleagues.",
    ]);
  });

  it("includes the phone only when given and marks an empty message", () => {
    const { body } = contactEmailParts({ ...base, phone: " +91 98765 43210 ", message: "  ", topics: [], updates: false });
    expect(body).toContain("Phone: +91 98765 43210");
    expect(body).not.toContain("Topics:");
    expect(body).toContain("Product updates by email: No");
    expect(body.endsWith("Message:\r\n(no message)")).toBe(true);
  });

  it("shortens very long messages so the mailto URL stays usable", () => {
    const { body } = contactEmailParts({ ...base, message: "x".repeat(MAX_MESSAGE_CHARS + 500) });
    const msg = body.split("Message:\r\n")[1];
    expect(msg.startsWith("x".repeat(MAX_MESSAGE_CHARS))).toBe(true);
    expect(msg).toContain("[message shortened");
    expect(msg.length).toBeLessThan(MAX_MESSAGE_CHARS + 80);
  });
});

describe("buildContactMailto", () => {
  it("addresses the team inbox and percent-encodes subject and body", () => {
    const url = buildContactMailto(base);
    expect(url.startsWith(`mailto:${CONTACT_EMAIL}?subject=`)).toBe(true);
    expect(url).toContain("&body=");
    expect(url).not.toMatch(/[ \n\r]/);
    expect(url).toContain("%26"); // "&" inside values must not split the query
    expect(url).toContain("%0D%0A");
  });

  it("round-trips back to the same subject and body", () => {
    const url = new URL(buildContactMailto(base));
    const { subject, body } = contactEmailParts(base);
    expect(url.searchParams.get("subject")).toBe(subject);
    expect(url.searchParams.get("body")).toBe(body);
  });
});
