namespace TopologicalRendering.NormalisedStep

theorem normalised_step (M M' H H' K : Int)
    (hM : 0 < M) (hMM : M ≤ M') (hK : M' - M ≤ K)
    (hd : -K ≤ H' - H ∧ H' - H ≤ K) (hH0 : 0 ≤ H) (hHM : H ≤ M) :
    -(2 * K * M') ≤ H' * M - H * M' ∧ H' * M - H * M' ≤ 2 * K * M' := by
  have hg : 0 ≤ M' - M := by omega
  have hK0 : 0 ≤ K := by omega
  have hM0 : 0 ≤ M := by omega
  have p1 : (H' - H) * M ≤ K * M := Int.mul_le_mul_of_nonneg_right hd.2 hM0
  have p2 : (-K) * M ≤ (H' - H) * M := Int.mul_le_mul_of_nonneg_right hd.1 hM0
  have p3 : H * (M' - M) ≤ M * (M' - M) := Int.mul_le_mul_of_nonneg_right hHM hg
  have p4 : M * (M' - M) ≤ M * K := Int.mul_le_mul_of_nonneg_left hK hM0
  have p5 : 0 ≤ H * (M' - M) := Int.mul_nonneg hH0 hg
  have p6 : K * M ≤ K * M' := Int.mul_le_mul_of_nonneg_left hMM hK0
  have p7 : M * K ≤ M' * K := Int.mul_le_mul_of_nonneg_right hMM hK0
  have e1 : H' * M - H * M' = (H' - H) * M - H * (M' - M) := by
    rw [Int.sub_mul, Int.mul_sub]
    omega
  have e2 : (-K) * M = -(K * M) := Int.neg_mul K M
  have e3 : 2 * K * M' = K * M' + M' * K := by
    rw [Int.mul_comm M' K, Int.mul_assoc]
    omega
  have e4 : M * K = K * M := Int.mul_comm M K
  constructor <;> omega

end TopologicalRendering.NormalisedStep

#print axioms TopologicalRendering.NormalisedStep.normalised_step
