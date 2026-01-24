import type { CheerioAPI } from "cheerio";

import { getMetaContentAny } from "./utils";

/**
 * Valid gender values per OpenGraph spec.
 */
export type ProfileGender = "male" | "female";

/**
 * OpenGraph Profile metadata.
 * @see https://ogp.me/#type_profile
 */
export interface ProfileData {
  /** Given name */
  firstName?: string;
  /** Family name */
  lastName?: string;
  /** Short unique identifier string */
  username?: string;
  /** Gender (only "male" or "female" per spec) */
  gender?: ProfileGender;
}

const getProfileContent = ($: CheerioAPI, name: string): string | undefined =>
  getMetaContentAny($, `profile:${name}`) ??
  getMetaContentAny($, `og:profile:${name}`);

const isValidGender = (value: string | undefined): value is ProfileGender =>
  value === "male" || value === "female";

export const parseProfile = ($: CheerioAPI): ProfileData => {
  const firstName = getProfileContent($, "first_name");
  const lastName = getProfileContent($, "last_name");
  const username = getProfileContent($, "username");
  const rawGender = getProfileContent($, "gender");

  const gender = isValidGender(rawGender) ? rawGender : undefined;

  return {
    firstName,
    gender,
    lastName,
    username,
  };
};
