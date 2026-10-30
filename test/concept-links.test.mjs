// Tests for scripts/concept-links.mjs, the concept link lint.
// What: each case builds a tiny repo in a temp folder and runs the lint on it.
// Why: the lint must fail on an unlinked first use, an orphan page and a page that disagrees with the data file,
//   and pass when all three are right. Next step: run `node --test test/concept-links.test.mjs`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkConcepts } from "../scripts/concept-links.mjs";

const LABELS = ["*Also called:*", "**What it is:**", "**Next step:**"];
const PAGE = "docs/4-explanation/concepts/WIDGET.md";
const INDEX = "docs/3-reference/INDEX.md";

function page({ also = "gizmo, gadget", name = "Widget" } = {}) {
  const ld = { "@context": "https://schema.org", "@type": "DefinedTerm", name, alternateName: also.split(", ") };
  return `# Widget\n\n*Also called:* ${also}\n\n**What it is:** a small part.\n\n**Next step:** read on.\n\n<script type="application/ld+json">\n${JSON.stringify(ld)}\n</script>\n`;
}

function repo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "concept-links-"));
  const data = {
    scan: ["docs"], skip: {}, index_page: INDEX, orphan_links_not_counted: [INDEX], page_labels: LABELS,
    concepts: [{ id: "widget", term: "Widget", page: PAGE, also_called: ["gizmo", "gadget"], match: ["widget", "gizmo"] }],
  };
  const all = {
    "docs/_registry/concept_index.json": JSON.stringify(data),
    [PAGE]: page(),
    [INDEX]: "| [Widget](../4-explanation/concepts/WIDGET.md) | gizmo |\n",
    ...files,
  };
  for (const [rel, text] of Object.entries(all)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

test("passes when the first use links to the page", () => {
  const errors = checkConcepts(repo({ "docs/A.md": "Use a [gizmo](4-explanation/concepts/WIDGET.md). A widget again.\n" }));
  assert.deepEqual(errors, []);
});

test("fails when the first use does not link, and names the line and the fix", () => {
  const errors = checkConcepts(repo({ "docs/A.md": "# Title with widget\n\nA Widgets list.\n\nLater: [widget](4-explanation/concepts/WIDGET.md).\n" }));
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], /^docs\/A\.md:3: first use of "Widgets"/);
  assert.match(errors[0], /Fix: write \[Widgets\]\(4-explanation\/concepts\/WIDGET\.md\)/);
});

test("ignores code, headings, hyphen-joined words and link targets", () => {
  const errors = checkConcepts(repo({
    "docs/A.md": "# widget\n\n`widget` and\n\n```\nwidget\n```\n\nmy-widget-tool and [x](https://example.com/widget)\n\nThen [widget](4-explanation/concepts/WIDGET.md).\n",
  }));
  assert.deepEqual(errors, []);
});

test("flags a page that no doc links to", () => {
  const errors = checkConcepts(repo({ "docs/A.md": "Nothing here.\n" }));
  assert.equal(errors.length, 1, errors.join("\n"));
  assert.match(errors[0], /WIDGET\.md: no doc links to this concept page \(orphan\)/);
});

test("flags a page whose Also called line or DefinedTerm differs from the data file", () => {
  const errors = checkConcepts(repo({ [PAGE]: page({ also: "gizmo", name: "Wodget" }), "docs/A.md": "A [widget](4-explanation/concepts/WIDGET.md).\n" }));
  assert.ok(errors.some((e) => /Also called:\* line differs/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /DefinedTerm name is "Wodget"/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /alternateName differs/.test(e)), errors.join("\n"));
});

test("flags an index that misses a page and a page with no data entry", () => {
  const errors = checkConcepts(repo({
    [INDEX]: "Nothing listed.\n",
    "docs/4-explanation/concepts/STRAY.md": "# Stray\n",
    "docs/A.md": "A [widget](4-explanation/concepts/WIDGET.md).\n",
  }));
  assert.ok(errors.some((e) => /INDEX\.md: does not link "Widget"/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /STRAY\.md: a concept page with no entry/.test(e)), errors.join("\n"));
});
