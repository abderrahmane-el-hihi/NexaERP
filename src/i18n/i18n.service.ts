"use server";

import { cookies } from "next/headers";
import { dictionaries, Locale } from "./dictionaries";

const LOCALE_COOKIE = "NEXT_LOCALE";
const DEFAULT_LOCALE: Locale = "en";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value as Locale;
  return dictionaries[locale] ? locale : DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return dictionaries[locale];
}

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/" });
}
