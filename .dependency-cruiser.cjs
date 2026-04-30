/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies are forbidden anywhere in the workspace.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphaned modules usually indicate dead code.",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$",
          "\\.d\\.ts$",
          "(^|/)tsup\\.config\\.ts$",
          "(^|/)vitest\\.config\\.ts$",
          "(^|/)vite\\.config\\.ts$",
        ],
      },
      to: {},
    },
    {
      name: "core-is-leaf",
      severity: "error",
      comment: "@aguspe/tiler-core is leaf-most: it must not depend on any other workspace package.",
      from: { path: "^packages/core/src" },
      to:   { path: "^packages/(?!core)" },
    },
    {
      name: "playwright-not-server",
      severity: "error",
      comment: "@aguspe/tiler-playwright must not depend on @aguspe/tiler-server (CI cost).",
      from: { path: "^packages/playwright/src" },
      to:   { path: "^packages/server" },
    },
    {
      name: "no-test-from-src",
      severity: "error",
      comment: "Source must not import from test files.",
      from: { pathNot: "\\.test\\.[tj]sx?$" },
      to:   { path:    "\\.test\\.[tj]sx?$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: { dot: { collapsePattern: "node_modules/[^/]+" } },
  },
};
