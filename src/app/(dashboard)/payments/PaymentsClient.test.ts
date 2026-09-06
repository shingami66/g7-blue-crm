import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getPaymentsDictionary,
} from "../../../lib/i18n/dictionaries/payments.ts";
import { getCommonDictionary } from "../../../lib/i18n/dictionaries/common.ts";

test("W5-SEARCH-002: Payments search uses draft state, explicit form submit, and does not navigate on every keystroke", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/app/(dashboard)/payments/PaymentsClient.tsx"),
    "utf8",
  );

  // Local draft state and synchronization
  assert.match(source, /const \[draftSearch, setDraftSearch\] = useState\(submittedSearch\)/);
  assert.match(source, /const lastSubmittedSearch = useRef\(submittedSearch\)/);
  assert.match(source, /setDraftSearch\(submittedSearch\)/);

  // Form submission and submit button
  assert.match(source, /<form[\s\S]*onSubmit=\{\(event\) =>/);
  assert.match(source, /type="submit"/);
  assert.match(source, /submitSearch\(\)/);

  // Does NOT navigate on every keystroke
  assert.doesNotMatch(source, /onChange=\{\s*\(value\)\s*=>\s*navigate/);
  assert.match(source, /onChange=\{\(value\) => setDraftSearch\(value\)\}/);

  // Clear handler clears search and navigates with page 1 reset
  assert.match(source, /onClear=\{handleClear\}/);
  assert.match(source, /function handleClear/);
  assert.match(source, /paymentListHref\(\{\s*\.\.\.query,\s*search:\s*undefined\s*\},\s*1\)/);

  // IME composition protection
  assert.match(source, /searchComposing/);
  assert.match(source, /if \(!searchComposing\.current\) submitSearch\(\)/);

  // Preserves pending state and aria-busy
  assert.match(source, /aria-busy=\{isSearchPending \|\| undefined\}/);
  assert.match(source, /isSearchPending &&/);
});

test("Payments dictionary and common search labels stay aligned", () => {
  const en = getPaymentsDictionary("en");
  const ar = getPaymentsDictionary("ar");
  const commonEn = getCommonDictionary("en");
  const commonAr = getCommonDictionary("ar");

  assert.equal(typeof en.searchPlaceholder, "string");
  assert.equal(typeof ar.searchPlaceholder, "string");
  assert.equal(commonEn.labels.search, "Search");
  assert.equal(commonAr.labels.search, "بحث");
  assert.equal(commonEn.states.searching, "Searching…");
  assert.equal(commonAr.states.searching, "جاري البحث…");
});
