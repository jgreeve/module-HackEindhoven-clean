// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import "./polyfills";
import React from "react";
import { createRoot } from "react-dom/client";
import { StudioApp } from "./components/StudioApp";
import { validateModules } from "./modules";
import "./index.css";

const moduleErrors = validateModules();
if (moduleErrors.length) {
  console.error("[studio] module registry:", moduleErrors);
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <StudioApp />
    </React.StrictMode>,
  );
}
