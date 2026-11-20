namespace TopologicalRendering.LemmaT

def bit (m i : Nat) : Bool := m.testBit (i % 6)

def runs1 (m : Nat) : Nat :=
  (List.range 6).countP fun i => bit m i && !bit m (i + 5)

def runs0 (m : Nat) : Nat :=
  (List.range 6).countP fun i => !bit m i && bit m (i + 5)

def comp (m : Nat) : Nat := m ^^^ 63

def Simple (m : Nat) : Prop := runs1 m = 1 ∧ runs0 m = 1

instance (m : Nat) : Decidable (Simple m) := inferInstanceAs (Decidable (_ ∧ _))

theorem runs_eq : ∀ m, m < 64 → m ≠ 0 → m ≠ 63 → runs1 m = runs0 m := by decide

theorem runs_pos : ∀ m, m < 64 → m ≠ 0 → m ≠ 63 → 1 ≤ runs1 m := by decide

theorem runs_comp : ∀ m, m < 64 → runs1 (comp m) = runs0 m ∧ runs0 (comp m) = runs1 m := by decide

theorem simple_comp : ∀ m, m < 64 → m ≠ 0 → m ≠ 63 → (Simple m ↔ Simple (comp m)) := by decide

theorem one_run_comp : ∀ m, m < 64 → m ≠ 0 → m ≠ 63 → (runs1 m = 1 ↔ runs1 (comp m) = 1) := by decide

theorem simple_iff_one_run : ∀ m, m < 64 → m ≠ 0 → m ≠ 63 → (Simple m ↔ runs1 m = 1) := by decide

example : Simple 7 := by decide
example : runs1 21 = 3 ∧ runs0 21 = 3 := by decide
example : ¬ Simple 21 := by decide

end TopologicalRendering.LemmaT

#print axioms TopologicalRendering.LemmaT.runs_eq
#print axioms TopologicalRendering.LemmaT.runs_pos
#print axioms TopologicalRendering.LemmaT.runs_comp
#print axioms TopologicalRendering.LemmaT.simple_comp
#print axioms TopologicalRendering.LemmaT.one_run_comp
#print axioms TopologicalRendering.LemmaT.simple_iff_one_run
