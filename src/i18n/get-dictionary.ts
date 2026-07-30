import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/zh";
import { zh } from "./dictionaries/zh";
import { en } from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { zh, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
