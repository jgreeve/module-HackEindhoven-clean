import type { ProjectModule } from "@hackeindhoven/module-contracts";
import { Surface } from "./Surface";

export const moduleDescriptor: ProjectModule = {
  id: "__MODULE_ID__",
  label: "__MODULE_ID__",
  description: "Describe the feature this module owns.",
  version: "0.1.0",
  docs: "https://github.com/jgreeve/module-HackEindhoven/tree/main/packages/module-__MODULE_ID__",
  modes: ["explore", "sketch"],
  defaultEnabled: true,
  dataSources: [],
  attribution: [],
  prompt: "",
  createTools: () => ({}),
  Surface,
};
