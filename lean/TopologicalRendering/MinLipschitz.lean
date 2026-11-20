namespace TopologicalRendering.MinLipschitz

def minL : Int → List Int → Int
  | x, [] => x
  | x, y :: ys => min x (minL y ys)

def Near (e : Nat) : List Int → List Int → Prop
  | [], [] => True
  | x :: xs, y :: ys => (x - y).natAbs ≤ e ∧ Near e xs ys
  | _, _ => False

theorem min_lip (e : Nat) (a b a' b' : Int) (ha : (a - a').natAbs ≤ e) (hb : (b - b').natAbs ≤ e) :
    (min a b - min a' b').natAbs ≤ e := by
  omega

theorem minL_lip (e : Nat) (xs : List Int) :
    ∀ (x y : Int) (ys : List Int), Near e (x :: xs) (y :: ys) →
      (minL x xs - minL y ys).natAbs ≤ e := by
  induction xs with
  | nil =>
    intro x y ys h
    cases ys with
    | nil => exact h.1
    | cons _ _ => simp [Near] at h
  | cons z zs ih =>
    intro x y ys h
    cases ys with
    | nil => simp [Near] at h
    | cons w ws =>
      have h1 : (x - y).natAbs ≤ e := h.1
      have h2 := ih z w ws h.2
      exact min_lip e x (minL z zs) y (minL w ws) h1 h2

theorem minL_cap_lip (e : Nat) (x y c c' : Int) (xs ys : List Int)
    (h : Near e (x :: xs) (y :: ys)) (hc : (c - c').natAbs ≤ e) :
    (min c (minL x xs) - min c' (minL y ys)).natAbs ≤ e :=
  min_lip e c _ c' _ hc (minL_lip e xs x y ys h)

end TopologicalRendering.MinLipschitz

#print axioms TopologicalRendering.MinLipschitz.minL_lip
#print axioms TopologicalRendering.MinLipschitz.minL_cap_lip
