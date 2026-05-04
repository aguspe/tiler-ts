import { testAutomationPreset } from "./test_automation";
import type { PresetOptions, PresetOutput } from "./types";

export type PresetFactory = (opts?: PresetOptions) => PresetOutput;

const REGISTRY = new Map<string, PresetFactory>([
  ["test_automation", testAutomationPreset],
]);

export function getPreset(name: string): PresetFactory | undefined {
  return REGISTRY.get(name);
}

export function listPresets(): string[] {
  return Array.from(REGISTRY.keys());
}
