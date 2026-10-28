import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("Package Dry Run Inspection", () => {
  it("runs npm pack --dry-run and verifies package manifest and files", () => {
    const rawOutput = execSync("npm pack --dry-run --json", { encoding: "utf8" });
    // In case prepack output appears before the JSON array, find the first '[' and last ']'
    const jsonStart = rawOutput.indexOf("[");
    const jsonEnd = rawOutput.lastIndexOf("]");
    const jsonString = rawOutput.slice(jsonStart, jsonEnd + 1);
    const [packResult] = JSON.parse(jsonString);

    expect(packResult.name).toBe("media-capture-sdk");
    expect(packResult.version).toBe("1.0.0");

    const filenames = packResult.files.map((f) => f.path);

    // Verify main bundle
    expect(filenames).toContain("dist/index.js");
    expect(filenames).toContain("dist/index.cjs");
    expect(filenames).toContain("dist/index.d.ts");

    // Verify UI module
    expect(filenames).toContain("dist/ui/index.js");
    expect(filenames).toContain("dist/ui/index.cjs");
    expect(filenames).toContain("dist/ui/index.d.ts");
    expect(filenames).toContain("dist/ui/styles.css");

    // Verify filters module
    expect(filenames).toContain("dist/filters/index.js");
    expect(filenames).toContain("dist/filters/index.cjs");
    expect(filenames).toContain("dist/filters/index.d.ts");

    // Verify react module
    expect(filenames).toContain("dist/react/index.js");
    expect(filenames).toContain("dist/react/index.cjs");
    expect(filenames).toContain("dist/react/index.d.ts");

    // Verify root files
    expect(filenames).toContain("README.md");
    expect(filenames).toContain("LICENSE");
    expect(filenames).toContain("package.json");

    // Ensure tests and src are NOT bundled into npm tarball
    expect(filenames.some((f) => f.startsWith("tests/"))).toBe(false);
    expect(filenames.some((f) => f.startsWith("src/"))).toBe(false);
  });
});
