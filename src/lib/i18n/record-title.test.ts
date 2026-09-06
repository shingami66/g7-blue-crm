import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLegacyComposedTitle,
  resolveRecordTitle,
  resolveLocalizedRecordValue,
} from "./record-title.ts";

test("legacy composed title parsing requires exact delimiter and clear English/Arabic split", () => {
  // Canonical case
  const parsed = parseLegacyComposedTitle("Annual Corporate Conference | المؤتمر السنوي للشركة");
  assert.deepEqual(parsed, {
    en: "Annual Corporate Conference",
    ar: "المؤتمر السنوي للشركة",
  });

  // Reverse order
  const reversed = parseLegacyComposedTitle("المؤتمر السنوي للشركة | Annual Corporate Conference");
  assert.deepEqual(reversed, {
    en: "Annual Corporate Conference",
    ar: "المؤتمر السنوي للشركة",
  });

  // Safety: multiple delimiters must return null (ambiguous)
  assert.equal(parseLegacyComposedTitle("Part 1 | Part 2 | Part 3"), null);
  assert.equal(parseLegacyComposedTitle("Annual Conference | المؤتمر | المعرض"), null);

  // Safety: non-matching delimiters must return null
  assert.equal(parseLegacyComposedTitle("Annual Conference / المؤتمر السنوي"), null);
  assert.equal(parseLegacyComposedTitle("Annual Conference - المؤتمر السنوي"), null);
  assert.equal(parseLegacyComposedTitle("Annual Conference|المؤتمر السنوي"), null);

  // Safety: both sides Latin must return null
  assert.equal(parseLegacyComposedTitle("Section A | Section B"), null);

  // Safety: both sides Arabic must return null
  assert.equal(parseLegacyComposedTitle("القسم الأول | القسم الثاني"), null);

  // Safety: empty parts must return null
  assert.equal(parseLegacyComposedTitle(" | "), null);
  assert.equal(parseLegacyComposedTitle("Annual Conference | "), null);
  assert.equal(parseLegacyComposedTitle(" | المؤتمر السنوي"), null);
});

test("resolveRecordTitle adheres to strict resolution precedence", () => {
  // Precedence a: Explicit localized record fields take priority over everything
  const withExplicit = resolveRecordTitle(
    "en",
    "Composed Primary | عنوان ثانوي",
    null,
    { en: "Explicit English Title", ar: "عنوان عربي صريح" },
  );
  assert.equal(withExplicit, "Explicit English Title");

  const withExplicitAr = resolveRecordTitle(
    "ar",
    "Composed Primary | عنوان ثانوي",
    null,
    { en: "Explicit English Title", ar: "عنوان عربي صريح" },
  );
  assert.equal(withExplicitAr, "عنوان عربي صريح");

  // Precedence a fallback: If target locale explicit is missing, fall back to alternate explicit
  const explicitFallback = resolveRecordTitle(
    "ar",
    "Ignored Composed",
    null,
    { en: "English Only Explicit", ar: null },
  );
  assert.equal(explicitFallback, "English Only Explicit");

  // Precedence a2: Distinct primary (English) and secondary (Arabic) fields
  const distinctPairEn = resolveRecordTitle(
    "en",
    "Annual Corporate Conference",
    "المؤتمر السنوي للشركة",
  );
  assert.equal(distinctPairEn, "Annual Corporate Conference");

  const distinctPairAr = resolveRecordTitle(
    "ar",
    "Annual Corporate Conference",
    "المؤتمر السنوي للشركة",
  );
  assert.equal(distinctPairAr, "المؤتمر السنوي للشركة");

  // Precedence b: Narrowly scoped legacy composed title
  const composedEn = resolveRecordTitle("en", "Annual Corporate Conference | المؤتمر السنوي للشركة");
  assert.equal(composedEn, "Annual Corporate Conference");

  const composedAr = resolveRecordTitle("ar", "Annual Corporate Conference | المؤتمر السنوي للشركة");
  assert.equal(composedAr, "المؤتمر السنوي للشركة");

  // Precedence c: Original source value unchanged (source authentic, no machine translation)
  assert.equal(resolveRecordTitle("en", "Saudi Aramco Logistics"), "Saudi Aramco Logistics");
  assert.equal(resolveRecordTitle("ar", "Saudi Aramco Logistics"), "Saudi Aramco Logistics");
  assert.equal(resolveRecordTitle("en", "شركة الزامل للصناعة"), "شركة الزامل للصناعة");
  assert.equal(resolveRecordTitle("ar", "شركة الزامل للصناعة"), "شركة الزامل للصناعة");

  // Ambiguous pipe delimiter preserves source value unchanged
  const ambiguous = "Stage 1 | Hall B | Zone C";
  assert.equal(resolveRecordTitle("en", ambiguous), ambiguous);
  assert.equal(resolveRecordTitle("ar", ambiguous), ambiguous);
});

test("resolveLocalizedRecordValue selects locale value without concatenation", () => {
  const values = { en: "Catering Package", ar: "باقة الضيافة" };
  assert.equal(resolveLocalizedRecordValue("en", values), "Catering Package");
  assert.equal(resolveLocalizedRecordValue("ar", values), "باقة الضيافة");

  // Never concatenates
  assert.doesNotMatch(resolveLocalizedRecordValue("en", values), /\|/);
  assert.doesNotMatch(resolveLocalizedRecordValue("ar", values), /\|/);

  // Fallback when missing
  assert.equal(resolveLocalizedRecordValue("ar", { en: "English Only" }), "English Only");
  assert.equal(resolveLocalizedRecordValue("en", { ar: "عربي فقط" }), "عربي فقط");
  assert.equal(resolveLocalizedRecordValue("en", null, "Default Fallback"), "Default Fallback");
});
