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

const langs = await getLangs();
const header = dedent`
! name: Indie Wikis
! description: Brave Goggle to prioritize indie wikis (Based on Indie Wiki Buddy ${iwbVersion})
! public: false
! author: RuiNtD
! license: MIT
`;
const rules = await pMap(Object.entries(langs), async ([lang, langName]) => {
  const header = `! ${langName}`;
  const rules = (await getSites(lang)).map((site) => {
    return [
      `! ${site.destination}`,
      `$boost,site=${site.destination_base_url}`,
      ...site.origins.map((v) => `$discard,site=${v.origin_base_url}`),
    ].join("\n");
  });
  return `${header}\n\n${rules.join("\n\n")}`;
});
await $.path("out.goggle").writeText([header, ...rules].join("\n\n") + "\n");
