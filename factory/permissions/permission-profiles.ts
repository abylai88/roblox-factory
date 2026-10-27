export type PermissionAction = "allow" | "ask" | "deny";

export interface BashPermission {
  pattern: string;
  action: PermissionAction;
}

export interface PermissionProfile {
  edit: PermissionAction;
  bash: BashPermission[];
  todowrite: PermissionAction;
}

// ─── Security Denials (global, applied to all agents) ─────────────
export const SECURITY_DENIALS: BashPermission[] = [
  { pattern: "rm -rf*", action: "deny" },
  { pattern: "sudo*", action: "deny" },
  { pattern: "npm publish*", action: "deny" },
  { pattern: "chmod 777*", action: "deny" },
  { pattern: "chown *", action: "deny" },
  { pattern: "curl * | bash", action: "deny" },
  { pattern: "wget * | bash", action: "deny" }
];

// ─── Safe Read-Only Commands ──────────────────────────────────────
// These patterns must work for BOTH relative and absolute paths.
// The opencode wildcard matcher converts * → .* and optimizes trailing " *" to ( .*)?
// so "cat *" matches "cat", "cat file", and "cat /absolute/path/to/file.json".
export const SAFE_READ_ONLY: BashPermission[] = [
  { pattern: "ls", action: "allow" },
  { pattern: "ls *", action: "allow" },
  { pattern: "cat", action: "allow" },
  { pattern: "cat *", action: "allow" },
  { pattern: "find *", action: "allow" },
  { pattern: "grep *", action: "allow" },
  { pattern: "head *", action: "allow" },
  { pattern: "tail *", action: "allow" },
  { pattern: "wc *", action: "allow" },
  { pattern: "echo *", action: "allow" },
  { pattern: "echo", action: "allow" },
  { pattern: "git log*", action: "allow" },
  { pattern: "git diff*", action: "allow" },
  { pattern: "git status*", action: "allow" }
];

// ─── Safe Build/Test Commands (Roblox toolchain) ──────────────────
// rojo build/sourcemap only write into the project; selene/stylua --check
// only read. Formatting in place (stylua without --check) is for editors only.
export const SAFE_BUILD_TEST: BashPermission[] = [
  { pattern: "rojo build*", action: "allow" },
  { pattern: "rojo sourcemap*", action: "allow" },
  { pattern: "selene *", action: "allow" },
  { pattern: "stylua --check*", action: "allow" },
  { pattern: "lune run test*", action: "allow" }
];

// ─── Toolchain changes (download tools / packages) ───────────────
export const TOOLCHAIN_ASK: BashPermission[] = [
  { pattern: "rokit install*", action: "ask" },
  { pattern: "rokit add*", action: "ask" },
  { pattern: "wally install*", action: "ask" }
];

// ─── Profile Definitions ──────────────────────────────────────────

export const PROFILES: Record<string, PermissionProfile> = {
  tester: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST,
      { pattern: "rojo serve*", action: "ask" }
    ],
    todowrite: "deny"
  },

  reviewer: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST
    ],
    todowrite: "deny"
  },

  builder: {
    edit: "allow",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST,
      ...TOOLCHAIN_ASK,
      { pattern: "stylua *", action: "allow" },
      { pattern: "rojo serve*", action: "ask" }
    ],
    todowrite: "allow"
  },

  programmer: {
    edit: "allow",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST,
      ...TOOLCHAIN_ASK,
      { pattern: "stylua *", action: "allow" },
      { pattern: "rojo serve*", action: "ask" }
    ],
    todowrite: "allow"
  },

  researcher: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  market: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  competitor: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  idea: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  designer: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST
    ],
    todowrite: "deny"
  },

  director: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  gameplay: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  architect: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST
    ],
    todowrite: "deny"
  },

  monetization: {
    edit: "deny",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY
    ],
    todowrite: "deny"
  },

  content: {
    edit: "allow",
    bash: [
      ...SECURITY_DENIALS,
      ...SAFE_READ_ONLY,
      ...SAFE_BUILD_TEST,
      { pattern: "stylua *", action: "allow" }
    ],
    todowrite: "allow"
  }
};

export const AGENT_NAMES = Object.keys(PROFILES) as (keyof typeof PROFILES)[];
