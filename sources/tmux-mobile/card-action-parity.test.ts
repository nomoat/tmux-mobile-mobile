import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(
  new URL("../app/(app)/index.tsx", import.meta.url),
  "utf8",
);
const cardSource = appSource.slice(
  appSource.indexOf("function AgentCard("),
  appSource.indexOf("function CardSectionHeader("),
);

function expectInOrder(source: string, values: string[]) {
  let cursor = -1;
  for (const value of values) {
    const next = source.indexOf(value, cursor + 1);
    expect(next, `${value} should appear after the previous action`).toBeGreaterThan(cursor);
    cursor = next;
  }
}

describe("Command Center card action parity", () => {
  it("keeps the shared iOS and Android footer actions in order", () => {
    expectInOrder(cardSource, [
      'label="Interact"',
      'label="Transcript"',
      'label="Conversation"',
      'label="Copy conversation link"',
      'label="Drafts"',
      'label="Rename window"',
      'label={reading ? "Stop reading" : "Read aloud"}',
      'label="Open terminal"',
      'label="Complete and delete window"',
    ]);
    expect(cardSource).toContain("<Send");
    expect(cardSource).toContain("<BookOpen");
    expect(cardSource).toContain("<Link2");
    expect(cardSource).toContain("<List");
    expect(cardSource).toContain("<PencilLine");
    expect(cardSource).toContain("<Volume2");
    expect(cardSource).toContain("<ExternalLink");
    expect(cardSource).toContain("<Trash2");
  });

  it("keeps content actions beside their matching prompt or response heading", () => {
    expectInOrder(cardSource, [
      'label="Last prompt"',
      'label="Copy prompt"',
      'label="Last response"',
      'label="Open response"',
      'label="Pin response"',
      'label="Copy response"',
    ]);
  });

  it("keeps SSH contextual to the terminal instead of changing card muscle memory", () => {
    expect(cardSource).not.toContain("Open SSH terminal");
    expect(appSource).toMatch(
      /function WindowViewModal\([\s\S]*?label="Open SSH terminal"/,
    );
  });
});
