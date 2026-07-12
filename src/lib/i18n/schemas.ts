import { z } from "zod";
import { SUPPORTED_LOCALES } from "./locales";

export const localePreferenceSchema = z.enum(SUPPORTED_LOCALES);
