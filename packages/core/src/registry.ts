import type { ZodTypeAny } from "zod";
import type { WidgetDefinition } from "./widget";

const registry = new Map<string, WidgetDefinition>();

export function defineWidget<C extends ZodTypeAny, R>(
  def: WidgetDefinition<C, R>,
): WidgetDefinition<C, R> {
  if (registry.has(def.meta.type)) {
    throw new Error(`Widget "${def.meta.type}" already registered`);
  }
  registry.set(def.meta.type, def as unknown as WidgetDefinition);
  return def;
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}

export function listWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

/** Test-only: clear the registry between tests. Not part of the public API. */
export function __resetRegistryForTests(): void {
  registry.clear();
}
