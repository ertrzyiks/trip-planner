const normalizePlaceKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const extractLeadParagraph = (body: string) => {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("- "))
    .filter((line) => !line.startsWith("Coordinates:"))
    .filter((line) => !line.startsWith("Tags:"));

  return lines.find((line) => line.length > 40);
};

const parseFrontmatterValue = (raw: string, field: string) => {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return undefined;
  }

  const fieldRegex = new RegExp(`^${field}:\\s*[\"']?(.+?)[\"']?$`, "m");
  const fieldMatch = frontmatterMatch[1].match(fieldRegex);
  return fieldMatch?.[1]?.trim();
};

const stripFrontmatter = (raw: string) =>
  raw.replace(/^---\n[\s\S]*?\n---\n?/, "");

export const getPlaceDescriptionMap = () => {
  const markdownFiles = import.meta.glob("../content/places/*.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  const descriptions = new Map<string, string>();

  for (const [path, raw] of Object.entries(markdownFiles)) {
    const slug = path.split("/").pop()?.replace(/\.md$/, "") ?? "";
    const normalizedSlug = normalizePlaceKey(slug.replace(/[-_]/g, " "));
    const name =
      parseFrontmatterValue(raw, "name") ?? slug.replace(/[-_]/g, " ");
    const description =
      extractLeadParagraph(stripFrontmatter(raw)) ??
      parseFrontmatterValue(raw, "description");

    if (!description) {
      continue;
    }

    descriptions.set(normalizePlaceKey(name), description);
    descriptions.set(normalizedSlug, description);
  }

  return descriptions;
};

export { normalizePlaceKey };
