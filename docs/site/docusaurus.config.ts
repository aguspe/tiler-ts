import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "tiler-ts",
  tagline: "Plug-and-play dashboards for TypeScript / Node.js — Playwright-first.",

  url: "https://aguspe.github.io",
  baseUrl: "/tiler-ts/",
  organizationName: "aguspe",
  projectName: "tiler-ts",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: { defaultLocale: "en", locales: ["en"] },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Docs at site root: /, /reporter, /live-server, ...
          routeBasePath: "/",
          editUrl: "https://github.com/aguspe/tiler-ts/edit/main/docs/site/",
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "tiler-ts",
      logo: { alt: "tiler-ts", src: "img/tiler-logo.svg" },
      items: [
        { to: "/", label: "Docs", position: "left" },
        {
          href: "https://github.com/aguspe/tiler-ts",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Intro", to: "/" },
            { label: "Static reporter", to: "/reporter" },
            { label: "Live server", to: "/live-server" },
            { label: "CLI: import-playwright-json", to: "/cli-import" },
            { label: "Widgets tour", to: "/widgets-tour" },
          ],
        },
        {
          title: "More",
          items: [
            { label: "GitHub", href: "https://github.com/aguspe/tiler-ts" },
            {
              label: "npm: @aguspe/tiler-cli",
              href: "https://www.npmjs.com/package/@aguspe/tiler-cli",
            },
          ],
        },
      ],
      copyright: `MIT — © ${new Date().getFullYear()} tiler-ts contributors.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "tsx"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
