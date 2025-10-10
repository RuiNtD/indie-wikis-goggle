import { iwbBase, iwbVersion } from "./const.ts";
import * as z from "zod";
import pMap from "p-map";
import Handlebars from "handlebars";

const goggleTemp = Handlebars.compile(
  await Bun.file(
    Bun.resolveSync("./goggle.handlebars", import.meta.dir),
  ).text(),
);
const strictTemp = Handlebars.compile(
  await Bun.file(
    Bun.resolveSync("./strict.handlebars", import.meta.dir),
  ).text(),
);

const Site = z.object({
  origins_label: z.string(),
  origins: z.array(z.object({ origin_base_url: z.string() })),
  destination: z.string(),
  destination_base_url: z.string(),
});
const Sites = z.array(Site);
async function getSites(lang: string) {
  const resp = await fetch(`${iwbBase}/data/sites${lang}.json`);
  return Sites.parse(await resp.json());
}

const LocaleMessages = z.record(z.string(), z.object({ message: z.string() }));
async function getLangs() {
  const resp = await fetch(`${iwbBase}/_locales/en/messages.json`);
  const messages = LocaleMessages.parse(await resp.json());
  return Object.entries(messages)
    .filter(([k]) => k.startsWith("settingsLang") && k != "settingsLangAll")
    .map(([k, v]): [string, string] => [
      k.replace("settingsLang", ""),
      v.message,
    ]);
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

await Bun.write("out/indie_wikis.goggles", goggleTemp(data));
await Bun.write("out/strict.goggles", strictTemp(data));
