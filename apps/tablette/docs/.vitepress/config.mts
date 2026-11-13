// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// docs.tablette.bimr.net — the public documentation site.
//
// Built with VitePress from docs/ in the core repository. Module descriptors
// link to clean paths such as /modules/canutes, so cleanUrls stays on.

import { defineConfig } from "vitepress";

const SITE_URL = "https://docs.tablette.bimr.net";
const REPO_URL = "https://git.bimr.net/rvba/tablette";

export default defineConfig({
  lang: "en",
  title: "Tablette",
  description:
    "A Studio for generative apps: chat, files and a live surface in one browser page.",
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/tablette.svg" }],
    ["meta", { name: "theme-color", content: "#2563eb" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Tablette" }],
    ["meta", { property: "og:url", content: `${SITE_URL}/` }],
    ["meta", { property: "og:image", content: `${SITE_URL}/tablette.svg` }],
  ],

  themeConfig: {
    logo: "/tablette.svg",
    siteTitle: "Tablette",

    nav: [
      { text: "Guide", link: "/guide/", activeMatch: "^/guide/" },
      { text: "Modules", link: "/modules/", activeMatch: "^/modules/" },
      { text: "Reference", link: "/reference/architecture", activeMatch: "^/reference/" },
      { text: "Operations", link: "/operations/docs-site", activeMatch: "^/operations/" },
      { text: "App", link: "https://tablette.bimr.net" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "What is Tablette?", link: "/guide/" },
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Chat and workspace", link: "/guide/chat-and-workspace" },
            { text: "Modes", link: "/guide/modes" },
            { text: "Map apps", link: "/guide/map-apps" },
            { text: "Modules", link: "/guide/modules" },
            { text: "Settings", link: "/guide/settings" },
            { text: "Forge access", link: "/guide/forge" },
            { text: "Self-hosting", link: "/guide/self-hosting" },
            { text: "Troubleshooting", link: "/guide/troubleshooting" },
          ],
        },
      ],

      "/modules/": [
        {
          text: "Modules",
          items: [
            { text: "Catalogue", link: "/modules/" },
            { text: "Canutes", link: "/modules/canutes" },
            { text: "Open Data", link: "/modules/opendata" },
            { text: "Reports", link: "/modules/report" },
            { text: "Wikidata", link: "/modules/wikidata" },
            { text: "Wikimedia", link: "/modules/wikimedia" },
            { text: "BIMR", link: "/modules/bimr" },
          ],
        },
      ],

      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Architecture", link: "/reference/architecture" },
            { text: "Module SDK", link: "/reference/module-sdk" },
            { text: "Configuration", link: "/reference/configuration" },
            { text: "Commands", link: "/reference/commands" },
            { text: "Security", link: "/reference/security" },
          ],
        },
      ],

      "/operations/": [
        {
          text: "Operations",
          items: [
            { text: "Docs site", link: "/operations/docs-site" },
            { text: "Forge proxy", link: "/operations/proxy" },
            { text: "Forge administration", link: "/operations/fordj" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: REPO_URL }],

    editLink: {
      pattern: `${REPO_URL}/_edit/main/docs/:path`,
      text: "Edit this page on the forge",
    },

    footer: {
      message: "Released under the MIT license.",
      copyright: "© 2026 Milovann Yanatchkov",
    },

    search: {
      provider: "local",
    },

    outline: {
      level: [2, 3],
    },

    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
    lineNumbers: false,
  },

  sitemap: {
    hostname: SITE_URL,
  },
});
