import test from "node:test";
import assert from "node:assert/strict";
import { checkStoryInvariants } from "../scripts/check-story-invariants.mjs";

test("checkStoryInvariants passes when no invariants are violated", () => {
  const fakeRegistry = {
    _root: process.cwd(),
    invariants: [
      {
        pattern: "approved of (Theo|\\{\\{theo-vance\\}\\})",
        name: "Bob Barker approved of Theo",
        why: "Bob Barker never met Theo."
      }
    ]
  };

  const cleanText = "Sam called Chloe from the porch.";
  const result = checkStoryInvariants({
    registry: fakeRegistry,
    files: ["examples/scenes.json"]
  });

  assert.equal(result.pass, true);
  assert.equal(result.hits.length, 0);
  assert.equal(result.invariantsCount, 1);
});

test("checkStoryInvariants detects banned assertion and reports exact file and line", () => {
  import("node:fs").then((fs) => {
    import("node:path").then((path) => {
      import("node:os").then((os) => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "invariant-test-"));
        const testFile = path.join(tmpDir, "scene.md");
        fs.writeFileSync(testFile, "Line 1: Sam was pacing.\nLine 2: Bob Barker approved of Theo.\nLine 3: The end.\n");

        const fakeRegistry = {
          _root: tmpDir,
          invariants: [
            {
              pattern: "approved of (Theo|\\{\\{theo-vance\\}\\})",
              name: "Bob Barker approved of Theo",
              why: "Bob Barker was not alive when Sam met Theo."
            }
          ]
        };

        const result = checkStoryInvariants({
          registry: fakeRegistry,
          root: tmpDir,
          files: [testFile]
        });

        assert.equal(result.pass, false);
        assert.equal(result.hits.length, 1);
        assert.equal(result.hits[0].line, 2);
        assert.equal(result.hits[0].name, "Bob Barker approved of Theo");
        assert.match(result.hits[0].why, /Bob Barker was not alive/);

        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
      });
    });
  });
});
