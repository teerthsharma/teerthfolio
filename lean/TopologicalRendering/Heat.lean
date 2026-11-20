namespace TopologicalRendering.Heat

theorem contraction (a b M : Int) (ha : 0 ≤ a) (hab : a ≤ b) (hb : 0 < b)
    (H G D H' G' : Nat → Int)
    (hH : ∀ v, b * H' v = a * H v + b * D v)
    (hG : ∀ v, b * G' v = a * G v + b * D v)
    (hd : ∀ v, -M ≤ H v - G v ∧ H v - G v ≤ M) :
    ∀ v, -(a * M) ≤ b * (H' v - G' v) ∧ b * (H' v - G' v) ≤ a * M := by
  intro v
  have h1 := hH v
  have h2 := hG v
  have hd' := hd v
  have k1 : a * (H v - G v) ≤ a * M := Int.mul_le_mul_of_nonneg_left hd'.2 ha
  have k2 : -(a * M) ≤ a * (H v - G v) := by
    have := Int.mul_le_mul_of_nonneg_left hd'.1 ha
    rw [Int.mul_neg] at this
    exact this
  have e1 : a * (H v - G v) = a * H v - a * G v := Int.mul_sub a (H v) (G v)
  have e2 : b * (H' v - G' v) = b * H' v - b * G' v := Int.mul_sub b (H' v) (G' v)
  constructor <;> omega

theorem step_bound (a b M K : Int) (ha : 0 ≤ a) (hab : a ≤ b) (hb : 0 < b)
    (H D H' : Nat → Int)
    (hH : ∀ v, b * H' v = a * H v + b * D v)
    (hM : ∀ v, -M ≤ H v ∧ H v ≤ M)
    (hK : ∀ v, -K ≤ D v ∧ D v ≤ K) :
    ∀ v, -((b - a) * M + b * K) ≤ b * (H' v - H v) ∧
         b * (H' v - H v) ≤ (b - a) * M + b * K := by
  intro v
  have h1 := hH v
  have hMv := hM v
  have hKv := hK v
  have ba : 0 ≤ b - a := by omega
  have hb0 : 0 ≤ b := by omega
  have k1 : (b - a) * H v ≤ (b - a) * M := Int.mul_le_mul_of_nonneg_left hMv.2 ba
  have k2 : -((b - a) * M) ≤ (b - a) * H v := by
    have := Int.mul_le_mul_of_nonneg_left hMv.1 ba
    rw [Int.mul_neg] at this
    exact this
  have k3 : b * D v ≤ b * K := Int.mul_le_mul_of_nonneg_left hKv.2 hb0
  have k4 : -(b * K) ≤ b * D v := by
    have := Int.mul_le_mul_of_nonneg_left hKv.1 hb0
    rw [Int.mul_neg] at this
    exact this
  have e1 : (b - a) * H v = b * H v - a * H v := Int.sub_mul b a (H v)
  have e2 : b * (H' v - H v) = b * H' v - b * H v := Int.mul_sub b (H' v) (H v)
  constructor <;> omega

theorem invariant (a b K : Int) (ha : 0 ≤ a) (hab : a ≤ b) (hb : 0 < b)
    (H D H' : Nat → Int)
    (hH : ∀ v, b * H' v = a * H v + b * D v)
    (hD : ∀ v, 0 ≤ D v ∧ D v ≤ K)
    (hI : ∀ v, 0 ≤ H v ∧ (b - a) * H v ≤ b * K) :
    ∀ v, 0 ≤ H' v ∧ (b - a) * H' v ≤ b * K := by
  intro v
  have h1 := hH v
  have hI' := hI v
  have hD' := hD v
  have hb0 : 0 ≤ b := by omega
  have ba : 0 ≤ b - a := by omega
  have p1 : 0 ≤ a * H v := Int.mul_nonneg ha hI'.1
  have p2 : 0 ≤ b * D v := Int.mul_nonneg hb0 hD'.1
  have nn : 0 ≤ H' v := Int.le_of_mul_le_mul_left (by rw [Int.mul_zero]; omega) hb
  refine ⟨nn, ?_⟩
  have key0 : (b - a) * (b * H' v) = (b - a) * (a * H v + b * D v) := by rw [h1]
  have key : b * ((b - a) * H' v) = a * ((b - a) * H v) + b * ((b - a) * D v) := by grind
  have q1 : a * ((b - a) * H v) ≤ a * (b * K) := Int.mul_le_mul_of_nonneg_left hI'.2 ha
  have q2 : (b - a) * D v ≤ (b - a) * K := Int.mul_le_mul_of_nonneg_left hD'.2 ba
  have q3 : b * ((b - a) * D v) ≤ b * ((b - a) * K) := Int.mul_le_mul_of_nonneg_left q2 hb0
  have q4 : a * (b * K) + b * ((b - a) * K) = b * (b * K) := by grind
  have q5 : b * ((b - a) * H' v) ≤ b * (b * K) := by omega
  exact Int.le_of_mul_le_mul_left q5 hb

theorem sharp_step (a b K : Int) (ha : 0 ≤ a) (hab : a ≤ b) (hb : 0 < b)
    (H D H' : Nat → Int)
    (hH : ∀ v, b * H' v = a * H v + b * D v)
    (hD : ∀ v, 0 ≤ D v ∧ D v ≤ K)
    (hI : ∀ v, 0 ≤ H v ∧ (b - a) * H v ≤ b * K) :
    ∀ v, -K ≤ H' v - H v ∧ H' v - H v ≤ K := by
  intro v
  have h1 := hH v
  have hI' := hI v
  have hD' := hD v
  have hb0 : 0 ≤ b := by omega
  have ba : 0 ≤ b - a := by omega
  have pos1 : 0 ≤ (b - a) * H v := Int.mul_nonneg ba hI'.1
  have le1 : (b - a) * H v ≤ b * K := hI'.2
  have pos2 : 0 ≤ b * D v := Int.mul_nonneg hb0 hD'.1
  have le2 : b * D v ≤ b * K := Int.mul_le_mul_of_nonneg_left hD'.2 hb0
  have e1 : (b - a) * H v = b * H v - a * H v := Int.sub_mul b a (H v)
  have e2 : b * (H' v - H v) = b * H' v - b * H v := Int.mul_sub b (H' v) (H v)
  have e3 : b * -K = -(b * K) := Int.mul_neg b K
  have u1 : b * -K ≤ b * (H' v - H v) := by omega
  have u2 : b * (H' v - H v) ≤ b * K := by omega
  exact ⟨Int.le_of_mul_le_mul_left u1 hb, Int.le_of_mul_le_mul_left u2 hb⟩

end TopologicalRendering.Heat

#print axioms TopologicalRendering.Heat.contraction
#print axioms TopologicalRendering.Heat.step_bound
#print axioms TopologicalRendering.Heat.invariant
#print axioms TopologicalRendering.Heat.sharp_step
