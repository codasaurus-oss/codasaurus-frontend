export type SettingDescriptor = {
  key: string
  label: string
  group: string
  advanced: boolean
}

export const PRIMARY_GROUPS = ["Review policy", "Detectors", "Output behavior"] as const
export const ADVANCED_GROUPS = ["Runtime limits", "Security"] as const

export const GROUP_DESCRIPTIONS: Record<string, string> = {
  "Review policy": "Severity, strictness and finding limits.",
  Detectors: "Choose which detectors run on a pull request.",
  "Output behavior": "Comments, fixes and approvals.",
  "Runtime limits": "Workers, timeouts and review size limits.",
  Security: "Cookies, HSTS and metrics access.",
}

// Single source of truth for the settings page: group membership, plain
// labels, and whether a key belongs behind the "Advanced overrides" fold.
export const SETTINGS: SettingDescriptor[] = [
  { key: "default_severity", label: "Default severity", group: "Review policy", advanced: false },
  { key: "review_strictness", label: "Review strictness", group: "Review policy", advanced: false },
  { key: "max_blocking", label: "Max blocking findings", group: "Review policy", advanced: false },
  { key: "max_warnings", label: "Max warnings", group: "Review policy", advanced: false },
  { key: "forbidden_paths", label: "Forbidden paths", group: "Review policy", advanced: false },
  { key: "request_reviewers", label: "Request reviewers", group: "Review policy", advanced: false },
  { key: "create_check_run", label: "Create check run", group: "Review policy", advanced: false },
  { key: "update_pr_description", label: "Update PR description", group: "Review policy", advanced: false },

  { key: "hallucinated_imports_enabled", label: "Hallucinated imports", group: "Detectors", advanced: false },
  { key: "phantom_deps_enabled", label: "Phantom dependencies", group: "Detectors", advanced: false },
  { key: "vulnerabilities_enabled", label: "Vulnerabilities", group: "Detectors", advanced: false },
  { key: "secrets_enabled", label: "Secrets", group: "Detectors", advanced: false },
  { key: "over_engineering_enabled", label: "Over-engineering", group: "Detectors", advanced: false },
  { key: "boilerplate_enabled", label: "Boilerplate", group: "Detectors", advanced: false },
  { key: "todo_leaks_enabled", label: "TODO leaks", group: "Detectors", advanced: false },
  { key: "stale_api_enabled", label: "Stale API usage", group: "Detectors", advanced: false },
  { key: "risky_patterns_enabled", label: "Risky patterns", group: "Detectors", advanced: false },
  { key: "graph_enabled", label: "Repository graph", group: "Detectors", advanced: false },
  { key: "guidelines_enabled", label: "Guidelines", group: "Detectors", advanced: false },
  { key: "iac_enabled", label: "Infrastructure as code", group: "Detectors", advanced: false },
  { key: "auto_labels_enabled", label: "Auto labels", group: "Detectors", advanced: false },

  { key: "custom_instructions", label: "Custom instructions", group: "Output behavior", advanced: false },
  { key: "exclude_patterns", label: "Exclude patterns", group: "Output behavior", advanced: false },
  { key: "allow_auto_fix", label: "Allow auto fix", group: "Output behavior", advanced: false },
  { key: "auto_approve", label: "Auto approve", group: "Output behavior", advanced: false },
  { key: "pr_title_fix", label: "PR title fix", group: "Output behavior", advanced: false },

  { key: "audit_retention_days", label: "Audit retention (days)", group: "Runtime limits", advanced: true },
  { key: "queue_workers", label: "Queue workers", group: "Runtime limits", advanced: true },
  { key: "max_concurrent_reviews", label: "Max concurrent reviews", group: "Runtime limits", advanced: true },
  { key: "review_timeout_secs", label: "Review timeout (seconds)", group: "Runtime limits", advanced: true },
  { key: "max_inline_comments", label: "Max inline comments", group: "Runtime limits", advanced: true },
  { key: "max_reviewer_files", label: "Max reviewer files", group: "Runtime limits", advanced: true },
  { key: "max_comment_bytes", label: "Max comment bytes", group: "Runtime limits", advanced: true },
  { key: "max_llm_diff_chars", label: "Max LLM diff characters", group: "Runtime limits", advanced: true },
  { key: "auto_improve_max_files", label: "Auto-improve max files", group: "Runtime limits", advanced: true },
  { key: "auto_improve_max_diff", label: "Auto-improve max diff", group: "Runtime limits", advanced: true },

  { key: "hsts", label: "HSTS", group: "Security", advanced: true },
  { key: "metrics_token", label: "Metrics token", group: "Security", advanced: true },
  { key: "secure_cookies", label: "Secure cookies", group: "Security", advanced: true },
  { key: "insecure_cookies", label: "Insecure cookies", group: "Security", advanced: true },
]

export function groupSettings(group: string): SettingDescriptor[] {
  return SETTINGS.filter((setting) => setting.group === group)
}
