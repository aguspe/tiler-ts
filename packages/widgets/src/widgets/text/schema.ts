import { z } from "zod";

export const TextConfig = z.object({
  markdown: z.string().default(""),
  align: z.enum(["left", "center", "right"]).default("left"),
});
export type TextConfig = z.infer<typeof TextConfig>;
