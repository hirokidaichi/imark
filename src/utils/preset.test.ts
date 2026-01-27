import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILTIN_PRESETS,
  deletePreset,
  getPreset,
  getPresetsPath,
  listAllPresets,
  loadPresets,
  savePreset,
  savePresets,
} from "./preset.js";

describe("preset", () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ergon-preset-test-"));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getPresetsPath", () => {
    it("should return ~/.ergon/presets.json", () => {
      expect(getPresetsPath()).toBe(path.join(tempDir, ".ergon", "presets.json"));
    });
  });

  describe("BUILTIN_PRESETS", () => {
    it("should have builtin:square preset", () => {
      expect(BUILTIN_PRESETS["builtin:square"]).toEqual({
        aspectRatio: "1:1",
      });
    });

    it("should have builtin:landscape preset", () => {
      expect(BUILTIN_PRESETS["builtin:landscape"]).toEqual({
        aspectRatio: "16:9",
      });
    });

    it("should have builtin:portrait preset", () => {
      expect(BUILTIN_PRESETS["builtin:portrait"]).toEqual({
        aspectRatio: "9:16",
      });
    });
  });

  describe("loadPresets", () => {
    it("should return empty object when presets file does not exist", async () => {
      const presets = await loadPresets();
      expect(presets).toEqual({});
    });

    it("should load presets from file", async () => {
      const presetsDir = path.join(tempDir, ".ergon");
      await fs.mkdir(presetsDir, { recursive: true });
      await fs.writeFile(
        path.join(presetsDir, "presets.json"),
        JSON.stringify({ instagram: { aspectRatio: "1:1" } })
      );

      const presets = await loadPresets();
      expect(presets).toEqual({ instagram: { aspectRatio: "1:1" } });
    });
  });

  describe("savePresets", () => {
    it("should create presets directory and save presets", async () => {
      await savePresets({ instagram: { aspectRatio: "1:1" } });

      const presetsPath = path.join(tempDir, ".ergon", "presets.json");
      const content = await fs.readFile(presetsPath, "utf-8");
      expect(JSON.parse(content)).toEqual({ instagram: { aspectRatio: "1:1" } });
    });
  });

  describe("getPreset", () => {
    it("should return builtin preset", async () => {
      const preset = await getPreset("builtin:square");
      expect(preset).toEqual({ aspectRatio: "1:1" });
    });

    it("should return user preset", async () => {
      await savePresets({ mypreset: { engine: "nano-banana", format: "webp" } });
      const preset = await getPreset("mypreset");
      expect(preset).toEqual({ engine: "nano-banana", format: "webp" });
    });

    it("should return null for non-existent preset", async () => {
      const preset = await getPreset("nonexistent");
      expect(preset).toBeNull();
    });
  });

  describe("savePreset", () => {
    it("should save a new preset", async () => {
      await savePreset("test", { aspectRatio: "4:3" });
      const preset = await getPreset("test");
      expect(preset).toEqual({ aspectRatio: "4:3" });
    });

    it("should update an existing preset", async () => {
      await savePreset("test", { aspectRatio: "4:3" });
      await savePreset("test", { aspectRatio: "16:9", engine: "imagen4" });
      const preset = await getPreset("test");
      expect(preset).toEqual({ aspectRatio: "16:9", engine: "imagen4" });
    });

    it("should throw error when trying to save builtin preset", async () => {
      await expect(savePreset("builtin:square", { aspectRatio: "4:3" })).rejects.toThrow(
        "ビルトインプリセットは上書きできません"
      );
    });
  });

  describe("deletePreset", () => {
    it("should delete an existing preset", async () => {
      await savePreset("test", { aspectRatio: "4:3" });
      const deleted = await deletePreset("test");
      expect(deleted).toBe(true);
      const preset = await getPreset("test");
      expect(preset).toBeNull();
    });

    it("should return false for non-existent preset", async () => {
      const deleted = await deletePreset("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should throw error when trying to delete builtin preset", async () => {
      await expect(deletePreset("builtin:square")).rejects.toThrow(
        "ビルトインプリセットは削除できません"
      );
    });
  });

  describe("listAllPresets", () => {
    it("should list builtin presets", async () => {
      const presets = await listAllPresets();
      const builtins = presets.filter((p) => p.builtin);

      expect(builtins.length).toBe(Object.keys(BUILTIN_PRESETS).length);
      expect(builtins.some((p) => p.name === "builtin:square")).toBe(true);
    });

    it("should list user presets", async () => {
      await savePreset("mypreset", { aspectRatio: "1:1" });
      const presets = await listAllPresets();
      const userPresets = presets.filter((p) => !p.builtin);

      expect(userPresets.length).toBe(1);
      expect(userPresets[0].name).toBe("mypreset");
      expect(userPresets[0].preset).toEqual({ aspectRatio: "1:1" });
    });
  });
});
