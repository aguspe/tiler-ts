import rehypeSanitize, { defaultSchema, type Options } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const SAFE_SCHEMA: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ["rel", "noopener", "noreferrer"]],
  },
};

// Lazy-init the processor. Top-level construction breaks under CJS interop
// for these ESM-only unified plugins (default export becomes a namespace
// object). Building inside the function defers resolution until the call
// site, by which point Node's require shim has resolved the defaults.
let _processor: ReturnType<typeof unified> | null = null;

function getProcessor(): ReturnType<typeof unified> {
  if (_processor) return _processor;
  _processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, SAFE_SCHEMA)
    .use(rehypeStringify);
  return _processor;
}

export function renderMarkdown(source: string): string {
  return String(getProcessor().processSync(source));
}
