import { z } from "zod";

export const Id = z.string().min(1);

export const Slug = z.string().regex(/^[a-z0-9_-]+$/);

export const Iso = z.string().datetime();

export const SafeColumn = z.string().regex(/^[A-Za-z0-9_]+$/);
