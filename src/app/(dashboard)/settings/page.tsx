import { redirect } from "next/navigation";
import { getCompanySettingsForPage } from "@/lib/settings";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSettingsDictionary } from "@/lib/i18n/dictionaries/settings";
import SettingsForm from "./SettingsForm";

type CompanySettingsPageResult = Awaited<ReturnType<typeof getCompanySettingsForPage>>;

export default async function SettingsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getSettingsDictionary(locale);
  let settingsResult: CompanySettingsPageResult | null = null;
  let accessDenied = false;

  try {
    settingsResult = await getCompanySettingsForPage();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      accessDenied = true;
    } else {
      throw err;
    }
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col h-full max-w-3xl mx-auto">
        <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-6">
          <h1 className="text-[24px] leading-[32px] font-semibold mb-2">
            {dictionary.states.accessDenied}
          </h1>
          <p className="text-[14px] leading-[20px]">
            {dictionary.states.accessDeniedMessage}
          </p>
        </div>
      </div>
    );
  }

  if (!settingsResult) throw new Error("Company settings data was not loaded.");

  if ("error" in settingsResult) {
    return (
      <div className="flex flex-col h-full max-w-3xl mx-auto">
        <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-6">
          <h1 className="text-[24px] leading-[32px] font-semibold mb-2">
            {dictionary.states.unavailable}
          </h1>
          <p className="text-[14px] leading-[20px]">
            {dictionary.states.unavailableMessage}
          </p>
        </div>
      </div>
    );
  }

  return <SettingsForm {...settingsResult} dictionary={dictionary} />;
}
