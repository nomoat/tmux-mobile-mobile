import { describe, expect, it } from "vitest";
import {
  EDITABLE_FIELD_IDS,
  normalizeSpokenControllerUrl,
  resolveFieldPresentation,
  resolvePaneComposerPresentation,
  resolveVisionControls,
  requiresVisionModeChoice,
} from "./vision-controls";

describe("shared controls on every device", () => {
  it("ignores old forced-on preferences and uses the same layout on Vision Pro", () => {
    for (const preference of ["auto", "on"] as const) {
      for (const detected of [true, false]) {
        expect(resolveVisionControls(preference, detected)).toBe(false);
      }
    }
    for (const detected of [true, false, null]) {
      for (const saved of ["auto", "on", null] as const) {
        expect(requiresVisionModeChoice(detected, saved)).toBe(false);
      }
    }
  });
  it.each(EDITABLE_FIELD_IDS)(
    "%s stays available after removing the old Vision mode",
    (field) => {
      expect(resolveFieldPresentation(field, true)).toBe("editable-text");
      expect(resolveFieldPresentation(field, false)).toBe("editable-text");
    },
  );
  it("preserves uploads, shortcuts and the composer for legacy and current settings", () => {
    for (const visionControls of [true, false]) {
      expect(
        resolvePaneComposerPresentation({
          visionControls,
          showShortcuts: true,
          showUpload: true,
        }),
      ).toMatchObject({
        mountTextInput: true,
        showShortcuts: true,
        showUpload: true,
        showMore: false,
      });
      expect(resolveFieldPresentation("terminal-output", visionControls)).toBe(
        "readonly",
      );
    }
  });
});

describe("normalizeSpokenControllerUrl", () => {
  it("maps the default controller phrases", () => {
    expect(normalizeSpokenControllerUrl("eng dot impo dot ai")).toBe(
      "https://eng.xyznot.com",
    );
    expect(normalizeSpokenControllerUrl("production")).toBe(
      "https://eng.xyznot.com",
    );
  });

  it("normalizes a spoken custom host", () => {
    expect(normalizeSpokenControllerUrl("demo dot example dot com")).toBe(
      "https://demo.example.com",
    );
  });
});
