import { describe, it, expect } from "vitest";
import { describeRequestError } from "../diagnostics";

describe("describeRequestError", () => {
  it("pulls status, method, url and the server's message out of an axios error", () => {
    const d = describeRequestError({
      message: "Request failed with status code 403",
      config: { method: "get", url: "/reels/feed?limit=10" },
      response: { status: 403, data: { message: "Secondary devices cannot view other sessions." } },
    });
    expect(d.status).toBe(403);
    expect(d.method).toBe("GET");
    expect(d.url).toBe("/reels/feed?limit=10");
    expect(d.serverMessage).toBe("Secondary devices cannot view other sessions.");
    expect(d.noResponse).toBe(false);
  });

  it("flags a request that never got a response — the offline / blocked-origin case", () => {
    const d = describeRequestError({ message: "Network Error", config: { method: "get", url: "/feed/home" } });
    expect(d.noResponse).toBe(true);
    expect(d.status).toBeNull();
    expect(d.message).toBe("Network Error");
  });

  it("distinguishes a 5xx (server answered) from no response at all", () => {
    const d = describeRequestError({ message: "boom", response: { status: 502 }, config: {} });
    expect(d.status).toBe(502);
    expect(d.noResponse).toBe(false);
  });

  it("survives errors with no axios shape at all", () => {
    expect(describeRequestError(new Error("plain")).message).toBe("plain");
    expect(describeRequestError("just a string").message).toBe("just a string");
    const nothing = describeRequestError(undefined);
    expect(nothing.message).toBe("Unknown error");
    // Nothing was thrown by a request, so this is not a "no response" failure.
    expect(nothing.noResponse).toBe(false);
  });

  it("never throws on a malformed response body", () => {
    const d = describeRequestError({ response: { status: 500, data: null }, config: null });
    expect(d.serverMessage).toBeNull();
    expect(d.url).toBeNull();
    expect(d.method).toBeNull();
  });
});
