namespace TopologicalRendering.Flip

def step (lo hi : Int) (s : Bool) (x : Int) : Bool :=
  if hi ≤ x then true else if x ≤ lo then false else s

def flips (lo hi : Int) : Bool → List Int → Nat
  | _, [] => 0
  | s, x :: xs => (if step lo hi s x ≠ s then 1 else 0) + flips lo hi (step lo hi s x) xs

def tv : List Int → Nat
  | [] => 0
  | [_] => 0
  | x :: y :: r => (y - x).natAbs + tv (y :: r)

def dist (w : Int) : List Int → Nat
  | [] => 0
  | x :: _ => (x - w).natAbs

def StepBound (L : Nat) : List Int → Prop
  | [] => True
  | [_] => True
  | x :: y :: r => (y - x).natAbs ≤ L ∧ StepBound L (y :: r)

theorem tv_cons_eq (x : Int) (xs : List Int) : tv (x :: xs) = dist x xs + tv xs := by
  cases xs with
  | nil => simp [tv, dist]
  | cons y r => simp [tv, dist]

theorem tv_le_cons (x : Int) (xs : List Int) : tv xs ≤ tv (x :: xs) := by
  have hc := tv_cons_eq x xs
  omega

theorem dist_le (w x : Int) (xs : List Int) : dist w xs ≤ (x - w).natAbs + dist x xs := by
  cases xs with
  | nil => simp [dist]
  | cons y r =>
    have e : y - w = (y - x) + (x - w) := by omega
    have t := Int.natAbs_add_le (y - x) (x - w)
    show (y - w).natAbs ≤ (x - w).natAbs + (y - x).natAbs
    rw [e]
    omega

theorem flip_side (s b : Bool) (h : b ≠ s) :
    (s = true ∧ b = false) ∨ (s = false ∧ b = true) := by
  cases s <;> cases b <;> simp_all

theorem step_witness (lo hi : Int) (s : Bool) (x : Int) (hflip : step lo hi s x ≠ s) :
    (step lo hi s x = true → hi ≤ x) ∧ (step lo hi s x = false → x ≤ lo) := by
  unfold step at *
  by_cases h1 : hi ≤ x
  · simp [h1]
  · by_cases h2 : x ≤ lo
    · simp [h1, h2]
    · simp [h1, h2] at hflip

theorem flips_witness (lo hi : Int) (h : lo < hi) (s : Bool) (w : Int)
    (hw : (s = true → hi ≤ w) ∧ (s = false → w ≤ lo)) (xs : List Int) :
    flips lo hi s xs * (hi - lo).toNat ≤ dist w xs + tv xs := by
  induction xs generalizing s w with
  | nil => simp [flips, dist, tv]
  | cons x xs ih =>
    have hc := tv_cons_eq x xs
    have hdl := dist_le w x xs
    have hdd : dist w (x :: xs) = (x - w).natAbs := rfl
    simp only [flips]
    by_cases hf : step lo hi s x ≠ s
    · rw [if_pos hf, Nat.add_mul, Nat.one_mul]
      have hsw := step_witness lo hi s x hf
      have hd : (hi - lo).toNat ≤ (x - w).natAbs := by
        rcases flip_side s _ hf with ⟨hs, hb⟩ | ⟨hs, hb⟩
        · have h1 := hw.1 hs
          have h2 := hsw.2 hb
          omega
        · have h1 := hw.2 hs
          have h2 := hsw.1 hb
          omega
      have hi' := ih (step lo hi s x) x hsw
      omega
    · rw [if_neg hf, Nat.zero_add]
      have heq : step lo hi s x = s := by simpa using hf
      rw [heq]
      have := ih s w hw
      omega

theorem flips_mul_le (lo hi : Int) (h : lo < hi) (s : Bool) (xs : List Int) :
    flips lo hi s xs * (hi - lo).toNat ≤ tv xs + (hi - lo).toNat := by
  induction xs generalizing s with
  | nil => simp [flips, tv]
  | cons x xs ih =>
    have hc := tv_cons_eq x xs
    have hl := tv_le_cons x xs
    simp only [flips]
    by_cases hf : step lo hi s x ≠ s
    · rw [if_pos hf, Nat.add_mul, Nat.one_mul]
      have hw := step_witness lo hi s x hf
      have := flips_witness lo hi h (step lo hi s x) x hw xs
      omega
    · rw [if_neg hf, Nat.zero_add]
      have heq : step lo hi s x = s := by simpa using hf
      rw [heq]
      have := ih s
      omega

theorem tv_le_of_stepBound (L : Nat) (xs : List Int) (h : StepBound L xs) :
    tv xs ≤ L * (xs.length - 1) := by
  induction xs with
  | nil => simp [tv]
  | cons x xs ih =>
    cases xs with
    | nil => simp [tv]
    | cons y r =>
      have hb : (y - x).natAbs ≤ L ∧ StepBound L (y :: r) := h
      have ih' := ih hb.2
      have e1 : tv (x :: y :: r) = (y - x).natAbs + tv (y :: r) := by simp [tv]
      have e2 : (x :: y :: r).length - 1 = (y :: r).length := by simp
      have hm : 1 ≤ (y :: r).length := by simp
      rw [e1, e2]
      generalize (y :: r).length = m at ih' hm ⊢
      obtain ⟨k, rfl⟩ : ∃ k, m = k + 1 := ⟨m - 1, by omega⟩
      rw [Nat.add_sub_cancel] at ih'
      rw [Nat.mul_add, Nat.mul_one]
      have := hb.1
      omega

theorem flips_mul_le_of_stepBound (lo hi : Int) (h : lo < hi) (s : Bool) (L : Nat)
    (xs : List Int) (hb : StepBound L xs) :
    flips lo hi s xs * (hi - lo).toNat ≤ L * (xs.length - 1) + (hi - lo).toNat := by
  have h1 := flips_mul_le lo hi h s xs
  have h2 := tv_le_of_stepBound L xs hb
  exact Nat.le_trans h1 (Nat.add_le_add_right h2 _)

end TopologicalRendering.Flip

#print axioms TopologicalRendering.Flip.flips_mul_le
#print axioms TopologicalRendering.Flip.flips_mul_le_of_stepBound
