import { describe, expect, it } from "vitest"

import {
  ADVANCED_GROUPS,
  PRIMARY_GROUPS,
  SETTINGS,
  groupSettings,
} from "@/features/settings/advanced-fields"

describe("advanced settings registry", () => {
  it("has unique keys", () => {
    const keys = SETTINGS.map((setting) => setting.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("keeps primary groups small and classifies advanced keys", () => {
    const primary = SETTINGS.filter((setting) => !setting.advanced)
    expect(primary.length).toBeLessThan(30)
    for (const group of PRIMARY_GROUPS) {
      expect(groupSettings(group).length).toBeGreaterThan(0)
      expect(groupSettings(group).every((setting) => !setting.advanced)).toBe(true)
    }
    for (const group of ADVANCED_GROUPS) {
      expect(groupSettings(group).every((setting) => setting.advanced)).toBe(true)
    }
  })

  it("covers every key the old advanced list exposed", () => {
    const keys = new Set(SETTINGS.map((setting) => setting.key))
    expect(keys.has("max_llm_diff_chars")).toBe(true)
    expect(keys.has("secure_cookies")).toBe(true)
    expect(keys.has("review_strictness")).toBe(true)
  })
})
