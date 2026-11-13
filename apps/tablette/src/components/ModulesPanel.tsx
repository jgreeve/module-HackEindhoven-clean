// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/components/ModulesPanel.tsx — the visible Studio module catalogue.
//
// Used in Settings (compact) and in Explore (full): each module shows its
// scope, data sources, attribution, tools, optional settings and feature page.
// Enable/disable applies immediately; the agent picks it up on the next turn.

import { useEffect, useState } from "react";
import {
  MODULES,
  docsUrl,
  toolNamesForModule,
} from "../modules";
import type { ModuleSettingSpec, StudioModule } from "../modules/types";
import { MODE_LABELS } from "../app/mode";
import {
  getEnabledModuleIds,
  getModuleSettings,
  setModuleEnabled,
  setModuleSettings,
  subscribeModules,
} from "../app/modules";

function modeList(module: StudioModule): string {
  return module.modes.map((mode) => MODE_LABELS[mode]).join(", ");
}

function SettingsFields({ module }: { module: StudioModule }) {
  const specs = module.settings ?? [];
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const spec of specs) defaults[spec.key] = spec.default;
    return { ...defaults, ...getModuleSettings(module.id) };
  });

  const update = (spec: ModuleSettingSpec, value: unknown) => {
    const next = { ...values, [spec.key]: value };
    setValues(next);
    setModuleSettings(module.id, next);
  };

  return (
    <div className="module-settings">
      {specs.map((spec) => {
        const value = values[spec.key] ?? spec.default;
        return (
          <label className="field module-field" key={spec.key}>
            <span>{spec.label}</span>
            {spec.type === "boolean" ? (
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => update(spec, e.target.checked)}
              />
            ) : (
              <input
                type={spec.secret ? "password" : spec.type === "number" ? "number" : "text"}
                value={String(value ?? "")}
                placeholder={spec.placeholder}
                onChange={(e) =>
                  update(
                    spec,
                    spec.type === "number" ? Number(e.target.value) : e.target.value,
                  )
                }
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function ModuleCard({
  module,
  compact,
  onOpen,
}: {
  module: StudioModule;
  compact: boolean;
  onOpen?: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean>(() =>
    getEnabledModuleIds().has(module.id),
  );

  useEffect(() => {
    return subscribeModules((ids) => setEnabled(ids.has(module.id)));
  }, [module.id]);

  const tools = toolNamesForModule(module);
  const hasSettings = Boolean(module.settings?.length);

  return (
    <article className={`module-card ${enabled ? "on" : "off"}`}>
      <header className="module-head">
        <div className="module-title-wrap">
          <h3 className="module-title">{module.label}</h3>
          <span className="module-version">v{module.version}</span>
        </div>
        <label className="module-toggle" title="Enable or disable this module">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setModuleEnabled(module.id, e.target.checked)}
          />
          <span>{enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </header>

      <p className="module-desc">{module.description}</p>

      <div className="module-meta">
        <span className="module-chip">{modeList(module)}</span>
        <span className="module-chip">{tools.length} tools</span>
      </div>

      {compact ? (
        <p className="module-compact-sources">
          {module.dataSources.map((source) => `${source.label} · ${source.license}`).join(" · ")}
        </p>
      ) : (
        <>
          {tools.length > 0 && (
            <div className="module-tools" aria-label="Module tools">
              {tools.map((tool) => (
                <code key={tool}>{tool}</code>
              ))}
            </div>
          )}

          <div className="module-sources">
            {module.dataSources.map((source) => (
              <div className="module-source" key={source.id}>
                <div className="module-source-head">
                  <strong>{source.label}</strong>
                  <span>{source.license}</span>
                </div>
                <code className="module-endpoint">{source.endpoint}</code>
                <div className="module-source-meta">
                  <span>{source.auth === "none" ? "no auth" : "token"}</span>
                  <span>{source.cors ? "CORS" : "no CORS"}</span>
                  <span>{source.methods.join(" / ")}</span>
                  {source.licenseUrl && (
                    <a href={source.licenseUrl} target="_blank" rel="noreferrer">
                      license
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hasSettings && <SettingsFields module={module} />}

      <ul className="module-credits">
        {module.attribution.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <div className="module-actions">
        {!compact && module.Surface && onOpen && (
          <button type="button" className="btn small" onClick={onOpen}>
            Open
          </button>
        )}
        <a
          className="btn small"
          href={docsUrl(module.docs)}
          target="_blank"
          rel="noreferrer"
          title={module.docs}
        >
          Feature page
        </a>
      </div>
    </article>
  );
}

/** Module catalogue. `compact` is used in the Settings dialog. */
export function ModulesPanel({
  compact = false,
  onOpenSurface,
}: {
  compact?: boolean;
  onOpenSurface?: (module: StudioModule) => void;
}) {
  return (
    <div className={`modules ${compact ? "compact" : ""}`}>
      {MODULES.map((module) => (
        <ModuleCard
          key={module.id}
          module={module}
          compact={compact}
          onOpen={onOpenSurface ? () => onOpenSurface(module) : undefined}
        />
      ))}
    </div>
  );
}
