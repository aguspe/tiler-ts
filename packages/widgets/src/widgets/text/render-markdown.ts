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

/**
 * Lazy-init the processor. Top-level construction breaks under CJS interop
 * for these ESM-only unified plugins (default export becomes a namespace
 * object). Building inside the function defers resolution until call time,
 * by which point Node's require shim has resolved the defaults.
 *
 * The processor type is intentionally widened (`unknown`) — the unified
 * processor chain produces a complex generic type the consumer doesn't care
 * about. We only call `.processSync()` and stringify the result.
 */
type LazyProcessor = { processSync: (source: string) => unknown };
let _processor: LazyProcessor | undefined;

function getProcessor(): LazyProcessor {
  if (_processor) return _processor;
  _processor = unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, SAFE_SCHEMA)
    .use(rehypeStringify) as unknown as LazyProcessor;
  return _processor;
}

export function renderMarkdown(source: string): string {
  return String(getProcessor().processSync(source));
}
