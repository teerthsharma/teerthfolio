// WORLD data: the owner's 31 closed-unmerged PRs (gh search prs --author teerthsharma --state closed, minus merged; 2026-10-06),
// "Epsilon-Hollow #268" first, "topograph #422" last (egg 5), and the carved names the bible puts on the statues (3.6).
// [repo, number, title]
export const DEAD_PRS = [
  ["Epsilon-Hollow", 268, "Add accessibility labels to clear consol"],
  ["Epsilon-Hollow", 267, "Add ARIA label and focus styles to Conso"],
  ["Epsilon-Hollow", 265, "Add accessible focus states to console c"],
  ["Epsilon-Hollow", 263, "Add accessible focus states to console c"],
  ["Epsilon-Hollow", 259, "Add accessibility attributes to Console "],
  ["Epsilon-Hollow", 256, "Add ARIA label and focus styles to Conso"],
  ["Epsilon-Hollow", 255, "Add accessibility to Console Clear butto"],
  ["Epsilon-Hollow", 253, "Add accessibility attributes to console "],
  ["Epsilon-Hollow", 251, "Add accessibility and focus state to Con"],
  ["X-Rust", 2, "Export a visual's OGF_CHILDREN geometry;"],
  ["Epsilon-Hollow", 249, "Add a11y and UX to Console clear button"],
  ["Epsilon-Hollow", 248, "Add ARIA label and focus states to conso"],
  ["Epsilon-Hollow", 245, "Add accessibility to Console clear butto"],
  ["Epsilon-Hollow", 242, "Add transient success state and accessib"],
  ["Epsilon-Hollow", 238, "Add accessibility and focus states to Co"],
  ["Epsilon-Hollow", 235, "Add ARIA label and focus states to Conso"],
  ["Epsilon-Hollow", 233, "Add accessible states to console clear b"],
  ["Epsilon-Hollow", 232, "Improve ConsolePanel clear button UX and"],
  ["Epsilon-Hollow", 229, "Add accessibility attributes to Clear Lo"],
  ["Epsilon-Hollow", 214, "Add accessibility and focus states to co"],
  ["Epsilon-Hollow", 212, "Add accessibility and focus state to cle"],
  ["Epsilon-Hollow", 205, "Optimize ConsolePanel re-renders and lis"],
  ["tinygrad", 17456, "linearizer: hold CFGContext deps as a bi"],
  ["mujoco", 3461, "Sample the environment layer field in th"],
  ["mujoco", 3460, "Add environment layers to mjModel, MJCF "],
  ["mujoco", 3458, "Make mjsan.h compile under strict C11 wi"],
  ["triton", 11147, "Generate each loop body once instead of "],
  ["xla", 46539, "fix(gpu): make reduction group order det"],
  ["alphafold3", 706, "perf(buckets): add compilation buckets b"],
  ["mujoco", 3423, "Use linear scan for flexcomp unused-poin"],
  ["topograph", 422, "fix(topology): canonicalize compute inst"],
];

// carved names (sources: Epsilon-Hollow docs/THEOREMS.md, EpsilonTheorems.lean; the bible's section 3.6)
export const NAMES = [
  "TSS packing",                  // 0 hand        T1 tss_packing_bound, Lean:51
  "Certified beta-0",             // 1 skull       certified_beta0, certified_betti.rs
  "T4 AGCR, not certified",       // 2 god-form    alpha + beta/dt = 5.01 >= 1 at dt = 0.01
  "T8 TEB, Landauer",             // 3 maw         teb_energy_nonneg, Lean:245
  "tss_separation_guarantee",     // 4 spire       Lean:67  (body is True)
  "gmc_entropy_nonincreasing",    // 5 spire       Lean:109 (body is True)
  "phkp_perfect_locality",        // 6 spire       Lean:228 (body is True)
  "T6 RGCS",                      // 7 dead moon   Lean:213, no runtime consumer
  "T9 CMA",                       // 8 dead moon   Lean:283, no runtime consumer
  "T10 WPHB",                     // 9 dead moon   Lean:305, no runtime consumer
];
export const NAME = { hand: 0, skull: 1, god: 2, maw: 3, spireA: 4, spireB: 5, spireC: 6, moonA: 7, moonB: 8, moonC: 9 };
