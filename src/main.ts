import $ from "@david/dax";
import { iwbBase, iwbVersion } from "./const.ts";
import * as z from "zod";
import pMap from "p-map";
import dedent from "dedent";

const Site = z.object({
  origins_label: z.string(),
  origins: z.array(z.object({ origin_base_url: z.string() })),
  destination: z.string(),
  destination_base_url: z.string(),
});
const Sites = z.array(Site);
async function getSites(lang: string) {
  return Sites.parse(
    await $.request(`${iwbBase}/data/sites${lang}.json`).json()
  );
}

const LocaleMessages = z.record(z.string(), z.object({ message: z.string() }));
async function getLangs() {
  const messages = LocaleMessages.parse(
    await $.request(`${iwbBase}/_locales/en/messages.json`).json()
  );
  return Object.fromEntries(
    Object.entries(messages)
      .filter(([k]) => k.startsWith("settingsLang") && k != "settingsLangAll")
      .map(([k, v]) => [k.replace("settingsLang", ""), v.message])
  );
}

function formatBaseUrl(base: string) {
  const parts = base.split("/");
  if (parts.length == 1) return `$site=${base}`;
  const path = parts.slice(1).join("/");
  return `/${path}$site=${parts[0]}`;
}

const langs = await getLangs();
const header = dedent`
! name: Indie Wikis
! description: Brave Goggle to prioritize indie wikis (Based on Indie Wiki Buddy ${iwbVersion})
! public: false
! author: RuiNtD
! homepage: https://github.com/RuiNtD/indie-wikis-goggle
! avatar: #005799
! license: MIT
`;
const rules = await pMap(Object.entries(langs), async ([lang, langName]) => {
  const header = `! ${langName}`;
  const rules = (await getSites(lang)).map((site) =>
    [
      `! ${site.destination}`,
      formatBaseUrl(site.destination_base_url),
      ...site.origins.map((v) => `${formatBaseUrl(v.origin_base_url)},discard`),
    ].join("\n")
  );
  return `${header}\n\n${rules.join("\n\n")}`;
});
await $.path("indie_wikis.goggles").writeText(
  [header, ...rules].join("\n\n") + "\n"
);
