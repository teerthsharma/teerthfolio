namespace TopologicalRendering.Shrink

def latch (lo hi : Int) (s : Bool) (x u : Int) : Bool :=
  if x < lo + u then true else if hi + u < x then false else s

def lat (lo hi : Int) (s0 : Bool) (C u : Nat → Int) : Nat → Bool
  | 0 => s0
  | t + 1 => latch lo hi (lat lo hi s0 C u t) (C (t + 1)) (u (t + 1))

theorem latch_mono (lo hi : Int) (s s' : Bool) (hs : s' = true → s = true)
    (x u u' : Int) (hu : u' ≤ u) :
    latch lo hi s' x u' = true → latch lo hi s x u = true := by
  unfold latch
  by_cases h1 : x < lo + u'
  · have : x < lo + u := by omega
    simp [h1, this]
  · by_cases h2 : hi + u' < x
    · simp [h1, h2]
    · by_cases h3 : x < lo + u
      · simp [h3]
      · have h4 : ¬ hi + u < x := by omega
        simp only [h1, h2, h3, h4, ite_false]
        exact hs

theorem lat_mono (lo hi : Int) (s0 s0' : Bool) (hs : s0' = true → s0 = true)
    (C u u' : Nat → Int) (hu : ∀ t, u' t ≤ u t) :
    ∀ t, lat lo hi s0' C u' t = true → lat lo hi s0 C u t = true := by
  intro t
  induction t with
  | zero => exact hs
  | succ t ih => exact latch_mono lo hi _ _ ih _ _ _ (hu (t + 1))

end TopologicalRendering.Shrink

#print axioms TopologicalRendering.Shrink.lat_mono
