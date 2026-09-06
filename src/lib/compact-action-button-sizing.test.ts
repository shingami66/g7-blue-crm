import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("compact Settings and Supplier Rate Card actions opt into the compact Button size", () => {
  const settings = read("src/app/(dashboard)/settings/SettingsForm.tsx");
  const rateCards = read("src/app/(dashboard)/suppliers/SupplierRateCardsList.tsx");
  const button = read("src/components/ui/Button.tsx");

  assert.equal((settings.match(/<Button\b/g) ?? []).length, 3);
  assert.equal((settings.match(/size="sm"/g) ?? []).length, 3);
  assert.match(settings, /<Button onClick=\{handleCancel\}[^>]*size="sm"/);
  assert.match(settings, /<Button form="company-settings-form"[^>]*size="sm"/);
  assert.match(settings, /<Button onClick=\{\(\) =>[\s\S]*?size="sm"/);

  assert.equal((rateCards.match(/<Button\b/g) ?? []).length, 5);
  assert.equal((rateCards.match(/size="sm"/g) ?? []).length, 5);
  assert.match(rateCards, /<Button type="button" size="sm" onClick=\{openCreate\}/);
  assert.match(rateCards, /<Button type="button" size="sm" variant="outline" onClick=\{onCancel\}/);
  assert.match(rateCards, /<Button type="submit" size="sm" loading=\{submitting\}/);

  assert.match(
    button,
    /\{loading \? \([\s\S]*?<span aria-live=\{loading \? "polite" : undefined\}>\{buttonContent\}<\/span>[\s\S]*?\) : \(\s*children\s*\)\}/
  );
  assert.doesNotMatch(
    button,
    /\{loading && \([\s\S]*?<\/LoaderCircle>[\s\S]*?\)\}\s*<span aria-live=\{loading \? "polite" : undefined\}>\{buttonContent\}<\/span>/
  );
});
