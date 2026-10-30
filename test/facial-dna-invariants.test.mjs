// What this is: a test that every person in the registry has facial DNA, and no two people share the same face facts.
// Why it exists: image tools give different people the same face. Written face facts, checked here, keep each face its own.
// How to use it: run node --test test/facial-dna-invariants.test.mjs, or npm test.
// Next step: when a person is added to the registry, give them a facial_dna block before you run it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const registryPath = path.resolve(__dirname, '../character-registry.json')

test('Universal Facial DNA SSOT: every person provides valid, unique facial_dna', () => {
  const raw = readFileSync(registryPath, 'utf8')
  const registry = JSON.parse(raw)
  const characters = registry.characters || {}

  const requiredFields = [
    'bone_structure',
    'skin_phenotype',
    'eyes_and_brows',
    'nose_and_mouth',
    'rooted_hair'
  ]

  const seenProfiles = new Set()
  let checkedCount = 0

  for (const [id, entry] of Object.entries(characters)) {
    if (entry.kind === 'person') {
      const dna = entry.facial_dna || (entry.forms && entry.forms.facial_dna)
      assert.ok(dna, `MISSING_FACIAL_DNA_ERROR: Character ${id} is missing facial_dna`)

      for (const field of requiredFields) {
        assert.ok(
          dna[field] && typeof dna[field] === 'string' && dna[field].trim().length > 5,
          `MALFORMED_FACIAL_DNA_ERROR: Character ${id} has missing/invalid ${field}`
        )
      }

      // Check uniqueness: no two characters can share identical facial bone structure or profile
      const signature = `${dna.bone_structure}::${dna.skin_phenotype}::${dna.eyes_and_brows}`
      assert.ok(!seenProfiles.has(signature), `DUPLICATE_FACIAL_DNA_ERROR: Character ${id} has identical facial DNA to another character`)
      seenProfiles.add(signature)
      checkedCount++
    }
  }

  assert.ok(checkedCount >= 3, 'Must verify all persons in registry have facial DNA')
})
