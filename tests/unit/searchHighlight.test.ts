import { describe, expect, it } from "vitest";
import { splitHighlightedText } from "@/lib/search-highlight";

describe("splitHighlightedText", () => {
  it("returns the original text when the query is empty", () => {
    expect(splitHighlightedText("hello world", "")).toEqual(["hello world"]);
  });

  it("splits text around a single term", () => {
    expect(splitHighlightedText("hello world", "world")).toEqual(["hello ", "world", ""]);
  });

  it("supports multiple search terms", () => {
    expect(splitHighlightedText("alpha beta gamma", "alpha gamma")).toEqual([
      "",
      "alpha",
      " beta ",
      "gamma",
      "",
    ]);
  });

  it("escapes regex characters in the query", () => {
    expect(splitHighlightedText("use a+b literally", "a+b")).toEqual(["use ", "a+b", " literally"]);
  });
});
