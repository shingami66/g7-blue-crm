import { redirect } from "next/navigation";
import { getCompanySettingsForPage } from "@/lib/settings";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import SettingsForm from "./SettingsForm";

type CompanySettingsPageResult = Awaited<ReturnType<typeof getCompanySettingsForPage>>;

function AccessDenied() {
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-6">
        <h1 className="text-[24px] leading-[32px] font-semibold mb-2">Access Denied</h1>
        <p className="text-[14px] leading-[20px]">
          You do not have permission to view Company Settings.
        </p>
      </div>
    </div>
  );
}

function SettingsUnavailable() {
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-6">
        <h1 className="text-[24px] leading-[32px] font-semibold mb-2">
          Settings Unavailable
        </h1>
        <p className="text-[14px] leading-[20px]">
          Settings could not be loaded. Please contact your administrator.
        </p>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
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

  if (accessDenied) return <AccessDenied />;
  if (!settingsResult) throw new Error("Company settings data was not loaded.");
  if ("error" in settingsResult) return <SettingsUnavailable />;
  return <SettingsForm {...settingsResult} />;
}
