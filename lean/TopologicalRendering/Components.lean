namespace TopologicalRendering.Components

inductive Reach (adj : Nat → Nat → Prop) (S : Nat → Prop) : Nat → Nat → Prop
  | refl {u : Nat} : S u → Reach adj S u u
  | step {u w v : Nat} : Reach adj S u w → adj w v → S v → Reach adj S u v

theorem Reach.endpoints {adj : Nat → Nat → Prop} {S : Nat → Prop} {u v : Nat}
    (h : Reach adj S u v) : S u ∧ S v := by
  induction h with
  | refl hS => exact ⟨hS, hS⟩
  | step _ _ hSv ih => exact ⟨ih.1, hSv⟩

theorem Reach.trans {adj : Nat → Nat → Prop} {S : Nat → Prop} {u v w : Nat}
    (h₁ : Reach adj S u v) (h₂ : Reach adj S v w) : Reach adj S u w := by
  induction h₂ with
  | refl _ => exact h₁
  | step _ hadj hSv ih => exact Reach.step ih hadj hSv

theorem Reach.symm {adj : Nat → Nat → Prop} {S : Nat → Prop} {u v : Nat}
    (hsym : ∀ a b, adj a b → adj b a) (h : Reach adj S u v) : Reach adj S v u := by
  induction h with
  | refl hS => exact Reach.refl hS
  | step hw hadj hSv ih =>
    have hSw : S _ := (Reach.endpoints hw).2
    exact Reach.trans (Reach.step (Reach.refl hSv) (hsym _ _ hadj) hSw) ih

theorem Reach.mono {adj : Nat → Nat → Prop} {S T : Nat → Prop} {u v : Nat}
    (hST : ∀ v, S v → T v) (h : Reach adj S u v) : Reach adj T u v := by
  induction h with
  | refl hS => exact Reach.refl (hST _ hS)
  | step _ hadj hSv ih => exact Reach.step ih hadj (hST _ hSv)

theorem supnorm_incl (f g : Nat → Int) (ε τ : Int)
    (h : ∀ v, f v - ε ≤ g v) : ∀ v, τ ≤ f v → τ - ε ≤ g v := by
  intro v hv
  have := h v
  omega

theorem interleave_forward (adj : Nat → Nat → Prop) (f g : Nat → Int) (ε τ : Int) (u v : Nat)
    (h : ∀ v, f v - ε ≤ g v ∧ g v - ε ≤ f v)
    (r : Reach adj (fun x => τ ≤ f x) u v) :
    Reach adj (fun x => τ - ε ≤ g x) u v := by
  refine Reach.mono (fun x hx => ?_) r
  have hx' : τ ≤ f x := hx
  have := (h x).1
  show τ - ε ≤ g x
  omega

theorem interleave_backward (adj : Nat → Nat → Prop) (f g : Nat → Int) (ε τ : Int) (u v : Nat)
    (h : ∀ v, f v - ε ≤ g v ∧ g v - ε ≤ f v)
    (r : Reach adj (fun x => τ - ε ≤ g x) u v) :
    Reach adj (fun x => τ - 2 * ε ≤ f x) u v := by
  refine Reach.mono (fun x hx => ?_) r
  have hx' : τ - ε ≤ g x := hx
  have := (h x).2
  show τ - 2 * ε ≤ f x
  omega

theorem interleave_composite (adj : Nat → Nat → Prop) (f g : Nat → Int) (ε τ : Int) (u v : Nat)
    (h : ∀ v, f v - ε ≤ g v ∧ g v - ε ≤ f v)
    (r : Reach adj (fun x => τ ≤ f x) u v) :
    Reach adj (fun x => τ - 2 * ε ≤ f x) u v :=
  interleave_backward adj f g ε τ u v h (interleave_forward adj f g ε τ u v h r)

end TopologicalRendering.Components

#print axioms TopologicalRendering.Components.Reach.endpoints
#print axioms TopologicalRendering.Components.Reach.trans
#print axioms TopologicalRendering.Components.Reach.symm
#print axioms TopologicalRendering.Components.Reach.mono
#print axioms TopologicalRendering.Components.supnorm_incl
#print axioms TopologicalRendering.Components.interleave_forward
#print axioms TopologicalRendering.Components.interleave_backward
#print axioms TopologicalRendering.Components.interleave_composite
