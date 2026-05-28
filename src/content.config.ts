import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const places = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/places" }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    captureDate: z.string(),
  }),
});

export const collections = {
  places,
};
