import type { StudioModule } from "@tablette/module-sdk";

export interface ModuleSample {
  id: string;
  title: string;
  description: string;
  html: string;
  created: string;
  tags?: string[];
  license?: string;
  attribution?: string[];
}

export interface ProjectModule extends StudioModule {
  samples?: readonly ModuleSample[];
}

export function collectModuleSamples(
  modules: readonly ProjectModule[],
  enabled: ReadonlySet<string>,
): ModuleSample[] {
  const ids = new Set<string>();
  const samples: ModuleSample[] = [];
  for (const module of modules) {
    if (!enabled.has(module.id)) continue;
    for (const sample of module.samples ?? []) {
      if (!/^[a-z][a-z0-9-]*$/.test(sample.id) ||
          (sample.id !== module.id && !sample.id.startsWith(`${module.id}-`))) {
        throw new Error(`Sample "${sample.id}" must be prefixed with module id "${module.id}"`);
      }
      if (ids.has(sample.id)) throw new Error(`Duplicate module sample: ${sample.id}`);
      ids.add(sample.id);
      samples.push(sample);
    }
  }
  return samples;
}
