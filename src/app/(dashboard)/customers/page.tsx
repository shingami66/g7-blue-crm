import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getCustomers } from "@/lib/customers/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getCustomersDictionary } from "@/lib/i18n/dictionaries/customers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getCustomersDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  let customers: Awaited<ReturnType<typeof getCustomers>>;
  let canWrite = false;
  let canExport = false;
  let generatedBy = dictionary.list.report.chrome.systemGenerated;

  try {
    customers = await getCustomers();
    canWrite = await checkPermission("customers:write");
    canExport = await checkPermission("customers:export");
    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
      // Stored identity values (name/email) are not translated.
      if (name && email) {
        generatedBy = `${name} (${email})`;
      } else if (email) {
        generatedBy = email;
      } else if (name) {
        generatedBy = name;
      }
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.customersForbidden}
        />
      );
    }

    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.customersLoadError}
        role="alert"
      />
    );
  }

  return (
    <CustomersClient
      customers={customers}
      canWrite={canWrite}
      canExport={canExport}
      generatedBy={generatedBy}
      dictionary={dictionary}
    />
  );
}
