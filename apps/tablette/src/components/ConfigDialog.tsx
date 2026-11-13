// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useState } from "react";
import { PROVIDER_PRESETS, loadConfig, providerFor, saveConfig } from "../agent/config";
import type { AgentConfig } from "../agent/config";
import { ModulesPanel } from "./ModulesPanel";

interface Props {
  onClose: () => void;
}

type Tab = "model" | "forge" | "modules";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "model", label: "Model" },
  { id: "forge", label: "Forge" },
  { id: "modules", label: "Modules" },
];

export function ConfigDialog({ onClose }: Props) {
  const [cfg, setCfg] = useState<AgentConfig>(() => loadConfig());
  const [tab, setTab] = useState<Tab>("model");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    saveConfig(cfg);
    onClose();
  };

  const preset = providerFor(cfg);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog settings" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`settings-tab ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "model" && (
          <div className="settings-section">
            <div className="provider-presets">
              {PROVIDER_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`btn ${preset?.id === p.id ? "primary" : ""}`}
                  onClick={() => setCfg({ ...cfg, baseUrl: p.baseUrl, model: p.model })}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="dialog-note">
              {preset?.note ??
                "Any OpenAI-compatible endpoint works. The base URL and the model id must match the API key provider."}
            </p>

            <label className="field">
              <span>Base URL</span>
              <input
                type="text"
                spellCheck={false}
                value={cfg.baseUrl}
                onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value.trim() })}
              />
            </label>

            <label className="field">
              <span>API key</span>
              <input
                type="password"
                value={cfg.apiKey}
                placeholder={preset?.keyHint ?? "API key"}
                onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value.trim() })}
              />
            </label>

            <label className="field">
              <span>Model</span>
              <input
                type="text"
                spellCheck={false}
                value={cfg.model}
                placeholder={preset?.model ?? "model id"}
                onChange={(e) => setCfg({ ...cfg, model: e.target.value.trim() })}
              />
            </label>
            <p className="dialog-note">
              A 401 means the key and the base URL do not belong to the same
              provider. OpenRouter keys are <code>sk-or-v1-...</code>; DeepSeek
              keys are <code>sk-...</code> and use the DeepSeek preset.
            </p>
          </div>
        )}

        {tab === "forge" && (
          <div className="settings-section">
            <label className="field">
              <span>Forge URL</span>
              <input
                type="text"
                spellCheck={false}
                value={cfg.forgeUrl}
                placeholder="https://artefacts.bimr.net"
                onChange={(e) => setCfg({ ...cfg, forgeUrl: e.target.value.trim() })}
              />
            </label>

            <label className="field">
              <span>Bot user</span>
              <input
                type="text"
                spellCheck={false}
                value={cfg.forgeUser}
                placeholder="bot"
                onChange={(e) => setCfg({ ...cfg, forgeUser: e.target.value.trim() })}
              />
            </label>

            <label className="field">
              <span>Access token</span>
              <input
                type="password"
                value={cfg.forgeToken}
                placeholder="Forgejo access token"
                onChange={(e) => setCfg({ ...cfg, forgeToken: e.target.value.trim() })}
              />
            </label>
          </div>
        )}

        {tab === "modules" && (
          <div className="settings-section">
            <p className="dialog-note">
              Data modules add tools, prompt instructions and public data
              sources to Sketch mode. Enable or disable a module immediately; the
              agent uses the new set on the next turn.
            </p>
            <ModulesPanel />
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn grey" onClick={save}>
            Save
          </button>
        </div>

        <p className="dialog-version">
          studio {import.meta.env.VITE_APP_VERSION ?? "0.0.0"} ·{" "}
          {import.meta.env.VITE_GIT_HASH ?? "dev"}
        </p>
      </div>
    </div>
  );
}
