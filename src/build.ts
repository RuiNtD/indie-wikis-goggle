import $ from "@david/dax";
import { iwbBase, iwbVersion } from "./const.ts";
import * as z from "zod";
import pMap from "p-map";
import Handlebars from "handlebars";

import goggleTemp from "./goggle.handlebars" with { type: "text" };
import strictTemp from "./strict.handlebars" with { type: "text" };
const goggleTemplate = Handlebars.compile(goggleTemp);
const strictTemplate = Handlebars.compile(strictTemp);

const Site = z.object({
  origins_label: z.string(),
  origins: z.array(z.object({ origin_base_url: z.string() })),
  destination: z.string(),
  destination_base_url: z.string(),
});
const Sites = z.array(Site);
async function getSites(lang: string) {
  return Sites.parse(
    await $.request(`${iwbBase}/data/sites${lang}.json`).json(),
  );
}

const LocaleMessages = z.record(z.string(), z.object({ message: z.string() }));
async function getLangs() {
  const messages = LocaleMessages.parse(
    await $.request(`${iwbBase}/_locales/en/messages.json`).json(),
  );
  return Object.entries(messages)
    .filter(([k]) => k.startsWith("settingsLang") && k != "settingsLangAll")
    .map(([k, v]) => [k.replace("settingsLang", ""), v.message]);
}

function parseBaseUrl(base: string) {
  const parts = base.split("/");
  if (parts.length == 1) return { path: "", site: base };
  const path = parts.slice(1).join("/");
  return { path: `/${path}`, site: parts[0] };
}

const langs = await getLangs();
const data = {
  iwbVersion,
  langs: await pMap(langs, async ([lang, name]) => ({
    name,
    sites: (await getSites(lang)).map((site) => ({
      dest: {
        name: site.destination,
        ...parseBaseUrl(site.destination_base_url),
      },
      origins: site.origins.map((v) => parseBaseUrl(v.origin_base_url)),
    })),
  })),
};

await $.path("out/indie_wikis.goggles").writeText(goggleTemplate(data));
await $.path("out/indie_wikis_strict.goggles").writeText(strictTemplate(data));
