import TopologicalRendering.Flip

namespace TopologicalRendering.Governor

open TopologicalRendering.Flip

def flipsShift (lo hi : Int) : Bool → List Int → List Int → Nat
  | s, x :: xs, u :: us =>
    (if step (lo + u) (hi + u) s x ≠ s then 1 else 0) +
      flipsShift lo hi (step (lo + u) (hi + u) s x) xs us
  | _, _, _ => 0

def sub : List Int → List Int → List Int
  | x :: xs, u :: us => (x - u) :: sub xs us
  | _, _ => []

theorem step_shift (lo hi u : Int) (s : Bool) (x : Int) :
    step (lo + u) (hi + u) s x = step lo hi s (x - u) := by
  unfold step
  by_cases h1 : hi ≤ x - u
  · have : hi + u ≤ x := by omega
    simp [h1, this]
  · have n1 : ¬ hi + u ≤ x := by omega
    by_cases h2 : x - u ≤ lo
    · have : x ≤ lo + u := by omega
      simp [h1, h2, n1, this]
    · have n2 : ¬ x ≤ lo + u := by omega
      simp [h1, h2, n1, n2]

theorem flipsShift_eq (lo hi : Int) (s : Bool) (xs us : List Int) :
    flipsShift lo hi s xs us = flips lo hi s (sub xs us) := by
  induction xs generalizing s us with
  | nil => cases us <;> simp [flipsShift, sub, flips]
  | cons x xs ih =>
    cases us with
    | nil => simp [flipsShift, sub, flips]
    | cons u us => simp only [flipsShift, sub, flips, step_shift, ih]

theorem dist_sub (x u : Int) (xs us : List Int) :
    dist (x - u) (sub xs us) ≤ dist x xs + dist u us := by
  cases xs <;> cases us <;> simp [sub, dist] <;> omega

theorem tv_sub_le (xs us : List Int) : tv (sub xs us) ≤ tv xs + tv us := by
  induction xs generalizing us with
  | nil => cases us <;> simp [sub, tv]
  | cons x xs ih =>
    cases us with
    | nil => simp [sub, tv]
    | cons u us =>
      show tv ((x - u) :: sub xs us) ≤ tv (x :: xs) + tv (u :: us)
      rw [tv_cons_eq, tv_cons_eq x, tv_cons_eq u]
      have h1 := dist_sub x u xs us
      have h2 := ih us
      omega

theorem flipsShift_mul_le (lo hi : Int) (h : lo < hi) (s : Bool) (xs us : List Int) :
    flipsShift lo hi s xs us * (hi - lo).toNat ≤ tv xs + tv us + (hi - lo).toNat := by
  rw [flipsShift_eq]
  have h1 := flips_mul_le lo hi h s (sub xs us)
  have h2 := tv_sub_le xs us
  omega

end TopologicalRendering.Governor

#print axioms TopologicalRendering.Governor.flipsShift_mul_le
