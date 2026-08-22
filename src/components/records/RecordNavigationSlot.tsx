import type { RecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import RecordNavigation, {
  RecordNavigationPlaceholder,
  type RecordNavigationState,
} from "./RecordNavigation";

interface RecordNavigationSlotProps {
  loadNavigation: () => Promise<RecordNavigationState>;
  basePath: string;
  recordType: string;
  dictionary: RecordNavigationDictionary;
  returnTo?: string;
  pendingLabel?: string;
}

export default async function RecordNavigationSlot({
  loadNavigation,
  basePath,
  recordType,
  dictionary,
  returnTo,
  pendingLabel,
}: RecordNavigationSlotProps) {
  let navigation: RecordNavigationState;

  try {
    navigation = await loadNavigation();
  } catch {
    return (
      <RecordNavigationPlaceholder
        recordType={recordType}
        dictionary={dictionary}
        state="unavailable"
      />
    );
  }

  return (
    <RecordNavigation
      basePath={basePath}
      recordType={recordType}
      navigation={navigation}
      dictionary={dictionary}
      returnTo={returnTo}
      pendingLabel={pendingLabel}
    />
  );
}
