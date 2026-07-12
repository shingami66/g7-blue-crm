import type { ServicesDictionary } from "./dictionaries/services.ts";
import { getSafeActionErrorMessage } from "./safe-action-error.ts";

export function getCreateServiceErrorMessage(
  code: string | undefined,
  dictionary: ServicesDictionary,
): string {
  return getSafeActionErrorMessage(
    code,
    {
      INVALID_INPUT: dictionary.actionErrors.invalidInput,
      UNAUTHORIZED: dictionary.actionErrors.unauthorized,
      FORBIDDEN: dictionary.actionErrors.forbidden,
      CUSTOMER_UNAVAILABLE: dictionary.actionErrors.customerUnavailable,
      GENERIC_FAILURE: dictionary.actionErrors.generic,
    },
    dictionary.actionErrors.generic,
  );
}

export function getEditServiceErrorMessage(
  code: string | undefined,
  dictionary: ServicesDictionary,
): string {
  return getSafeActionErrorMessage(
    code,
    {
      INVALID_INPUT: dictionary.actionErrors.invalidInput,
      UNAUTHORIZED: dictionary.actionErrors.unauthorized,
      FORBIDDEN: dictionary.actionErrors.forbidden,
      NOT_FOUND: dictionary.actionErrors.notFound,
      STATUS_CHANGE_DEFERRED: dictionary.actionErrors.statusChangeDeferred,
      STATUS_CONFLICT: dictionary.actionErrors.statusConflict,
      NO_FIELDS: dictionary.actionErrors.noFields,
      GENERIC_FAILURE: dictionary.actionErrors.generic,
    },
    dictionary.actionErrors.generic,
  );
}

export function getServiceStatusErrorMessage(
  code: string | undefined,
  dictionary: ServicesDictionary,
): string {
  return getSafeActionErrorMessage(
    code,
    {
      INVALID_INPUT: dictionary.actionErrors.invalidInput,
      UNAUTHORIZED: dictionary.actionErrors.unauthorized,
      FORBIDDEN: dictionary.actionErrors.forbidden,
      NOT_FOUND: dictionary.actionErrors.notFound,
      TRANSITION_BLOCKED: dictionary.actionErrors.transitionBlocked,
      GENERIC_FAILURE: dictionary.actionErrors.generic,
    },
    dictionary.actionErrors.generic,
  );
}
