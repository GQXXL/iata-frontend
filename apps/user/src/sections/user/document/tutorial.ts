import yaml from "js-yaml";

const BASE_URL = import.meta.env.VITE_TUTORIAL_BASE_URL || "tutorial";

// async function getVersion() {
//   // API rate limit: 60 requests per hour
//   const response = await fetch(
//     'https://data.jsdelivr.com/v1/stats/packages/gh/perfect-panel/ppanel-tutorial/versions',
//   );
//   const json = await response.json();
//   return json[0].version;
// }

async function getVersionPath() {
  return BASE_URL;
}

export async function getTutorial(path: string): Promise<{
  config?: Record<string, unknown>;
  content: string;
}> {
  const versionPath = await getVersionPath();
  try {
    const url = `${versionPath}/${path}`;
    const response = await fetch(url, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const match = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
    let data: Record<string, unknown> = {};
    let content = text;

    if (match) {
      try {
        data = (yaml.load(match[1] || "") as Record<string, unknown>) || {};
        content = match[2] || "";
      } catch (e) {
        console.error("Error parsing YAML frontmatter:", e);
      }
    }

    const markdown = addPrefixToImageUrls(content, getUrlPrefix(url));
    return {
      config: data,
      content: markdown,
    };
  } catch (error) {
    console.error("Error fetching the markdown file:", error);
    throw error;
  }
}

type TutorialItem = {
  title: string;
  path: string;
  show?: boolean;
  subItems?: TutorialItem[];
};

const processIcon = (item: TutorialItem) => {
  if (
    "icon" in item &&
    typeof item.icon === "string" &&
    !item.icon.startsWith("http")
  ) {
    item.icon = `${BASE_URL}/${item.icon}`;
  }
};

export async function getTutorialList() {
  const { config, content } = await getTutorial("SUMMARY.md");
  const navigation = config as Record<string, TutorialItem[]> | undefined;

  if (!navigation) {
    return parseTutorialToMap(content);
  }

  Object.values(navigation)
    .flat()
    .forEach((item) => {
      item.subItems?.forEach(processIcon);
    });

  Object.keys(navigation).forEach((locale) => {
    navigation[locale] = (navigation[locale] || [])
      .filter((item) => item.show !== false)
      .map((item) => ({
        ...item,
        subItems: item.subItems?.filter((sub) => sub.show !== false),
      }))
      .filter(
        (item) => !item.subItems || item.subItems.length > 0 || !!item.path
      );
  });

  return new Map(Object.entries(navigation));
}

function parseTutorialToMap(markdown: string): Map<string, TutorialItem[]> {
  const map = new Map<string, TutorialItem[]>();
  let currentSection = "";
  const lines = markdown.split("\n");

  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentSection = line.replace("## ", "").trim();
      map.set(currentSection, []);
    } else if (line.startsWith("* ")) {
      const [, text, link] = line.match(/\* \[(.*?)\]\((.*?)\)/) || [];
      if (text && link) {
        if (!map.has(currentSection)) {
          map.set(currentSection, []);
        }
        map.get(currentSection)!.push({ title: text, path: link });
      }
    } else if (line.startsWith("  * ")) {
      const [, text, link] = line.match(/\* \[(.*?)\]\((.*?)\)/) || [];
      if (text && link) {
        const lastItem = map.get(currentSection)?.slice(-1)[0];
        if (lastItem) {
          if (!lastItem.subItems) {
            lastItem.subItems = [];
          }
          lastItem.subItems.push({ title: text, path: link });
        }
      }
    }
  }

  return map;
}
function getUrlPrefix(url: string): string {
  return url.replace(/\/[^/]+\.md$/, "/");
}
function addPrefixToImageUrls(markdown: string, prefix: string): string {
  return markdown.replace(
    /!\[(.*?)\]\((.*?)\)/g,
    (_match, imgAlt, imgUrl) =>
      `![${imgAlt}](${imgUrl.startsWith("http") ? imgUrl : `${prefix}${imgUrl}`})`
  );
}
