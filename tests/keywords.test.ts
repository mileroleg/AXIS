import { describe, expect, it } from "vitest";
import { aggregateTerms, categorizeTerm, extractKeyPhrases, htmlToText } from "@/lib/keywords";

describe("htmlToText", () => {
  it("strips html and entities", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>world</b></p>")).toBe("Hello world");
  });
});

describe("extractKeyPhrases", () => {
  it("extracts phrase substrings", () => {
    const text = "Требуется опыт работы с React и TypeScript. Мы предлагаем офис.";
    const phrases = extractKeyPhrases(text);
    expect(phrases.some((x) => x.includes("React"))).toBeTruthy();
    expect(phrases.some((x) => x.toLowerCase().includes("мы предлагаем"))).toBeFalsy();
  });
});

describe("categorization", () => {
  it("categorizes tools/soft/hard", () => {
    expect(categorizeTerm("React development")).toBe("tools");
    expect(categorizeTerm("командная работа")).toBe("soft");
    expect(categorizeTerm("оптимизация процессов")).toBe("hard");
  });

  it("applies override", () => {
    expect(categorizeTerm("React development", { "react development": "soft" })).toBe("soft");
  });
});

describe("aggregate", () => {
  it("dedupes by lowercase and counts", () => {
    const result = aggregateTerms(["React", "react", "TypeScript"]);
    expect(result[0]).toEqual({ term: "React", count: 2 });
  });
});
