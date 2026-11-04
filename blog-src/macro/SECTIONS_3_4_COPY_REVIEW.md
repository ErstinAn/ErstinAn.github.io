# Sections 3–4 — extracted from latest/index.html

## Manifold Constraints and Low-Precision Training

We have looked at how far an update turns the weights. But that assumes the update changes the stored values. With limited precision, rounding can cancel a small update before it takes effect.

A common mixed-precision setup uses low precision for much of the forward and backward passes. It still keeps **FP32 master weights**—the parameter values that receive optimizer updates. This can speed up computation and reduce activation memory.[1]

We go a step further: we store the master weights themselves in **BF16**, with no extra FP32 copy. This saves additional weight-storage memory, but each updated weight must be rounded back to BF16. Here, we use round-to-nearest.[2]

Start with one stored weight $w$ and a proposed update $\delta$. The optimizer proposes $w+\delta$, but BF16 stores only certain values. Rounding selects the nearest one. If the proposed value stays inside the original rounding interval, the stored weight does not change. We call this **update cancellation**.

At $w=1.5$, adding $0.002$ rounds back to $1.5$. The update is nonzero; the stored change is zero.[2]

Proposed value 1.502Stored weight 1.5Actual change 0

Rounding cancels this update. Local ULP: 0.0078125.

**Figure 3.1.** A small update can leave the stored weight unchanged. Dashed lines mark the rounding boundaries.

Now keep the update at $0.004$ and change the weight. At $w=1.5$, the stored value changes to $1.5078125$. At $w=3$, the same update causes no change because the gap between nearby BF16 values is larger.

The update is the same. Only the weight scale changed. So update size alone is not enough: we need to compare it with weight size.

**Closed disclosure: Rounding thresholds**

Let $Q_{\mathrm{BF16}}$ denote rounding to the nearest BF16 value. The stored result is

$$
w^+=Q_{\mathrm{BF16}}(w+\delta).
$$

The local gap between neighboring values is a unit in the last place (ULP). If the update is smaller than half the gap in its direction, rounding keeps the original weight.

For the values in Figure 3.1, this condition is

$$
\frac{|\delta|}{|w|}<\frac{\operatorname{ULP}(w)}{2|w|}.
$$

At $w=1.5$, the local gap is $0.0078125$. Half that gap is $0.00390625$, so the update $0.002$ is canceled. At an exact midpoint, the example uses round-to-nearest, ties-to-even.[2]

The relative threshold for normal BF16 values is about $0.2\%$ to $0.4\%$. The example compares neighboring values directly, including the direction of the update. This is a coordinate-level rule, not a fixed cancellation threshold for a whole matrix.

## How do constraints control the relative update size?

For one coordinate, the relative size is $|\delta|/|w|$. Recall [Step 4: Rescale in Section 0](#s0-update-figure). It controls the proposed step size relative to the weight scale. For a matrix, we measure this relationship with the **update-to-weight ratio**:

$$
\rho_t=\frac{\|\Delta W_t\|_F}{\|W_t\|_F}.
$$

Here, $\Delta W_t$ is the proposed update before retraction and rounding. For Muon, it excludes weight decay. The ratio also equals the ratio of their RMS norms, so it compares typical entry sizes.[2]

MACRO-fro fixes the weight norm at $R$ and scales the proposed step with the same radius. For the idealized normalized update,

$$
\rho_t=\frac{\eta_tR}{R}=\eta_t.
$$

The radius cancels. The relative update follows the learning rate rather than weight growth.

Muon does not tie the update size to the weight norm in this way. If its weights grow without a matching increase in update size, $\rho_t$ falls. MACRO-spec also controls relative scale, but its ratio depends on the weight spectrum.[2]

**Closed disclosure: Ratios for the three optimizers**

For a matrix $W_t\in\mathbb R^{p\times n}$, let $d=\min(p,n)$. The Frobenius and RMS ratios are equal:

$$
\rho_t =\frac{\|\Delta W_t\|_F}{\|W_t\|_F} =\frac{\|\Delta W_t\|_{\mathrm{RMS}}}{\|W_t\|_{\mathrm{RMS}}}.
$$

For ideal full-rank matrix-sign directions, the three ratios are

$$
\rho_t= \begin{cases} \widetilde\eta_t\sqrt d/\|W_t\|_F, & \text{Muon},\\[2pt] \eta_t, & \text{MACRO-fro},\\[2pt] \eta_t\sqrt{\kappa(W_t)}, & \text{MACRO-spec}. \end{cases}
$$

The effective Muon coefficient $\widetilde\eta_t$ includes its update scaling. The Muon update excludes weight decay. Define the spectral factor

$$
\kappa(W_t)=\frac{d\|W_t\|_2^2}{\|W_t\|_F^2}.
$$

This factor describes the weight spectrum. The formulas use exact norm constraints and omit the small numerical stabilizer.[2]

For Figure 3.2, Muon ratios use recorded BF16 weight norms and an idealized update estimate. They are estimates of proposed updates, not measurements of the final stored change. The weight norm is measured; the proposed-update ratio is estimated.

This gives us two changes to watch: weights can grow, or updates can shrink. Either can make a proposed update small relative to its weight.

## How does weight growth affect Muon?

Does this scale effect appear in training? Figure 3.2 compares weight norms, estimated relative updates, and the loss gap over the same training period.

What about weight decay from [Section 2](#section-2)? Its shrinkage can also be too small to change a stored BF16 weight.[3]

The upper plot shows a selected matrix. The lower plot shows the **training-loss gap**, defined as BF16 loss minus FP32 loss. A positive gap means that BF16 training has higher loss. Compare **Weight norm** and **Update-to-weight ratio** with the gap below.

Solid: BF16. Dashed: FP32.

Weight norm ‖Wₜ‖F

Training-loss gap · BF16 − FP32

Move across either plot to compare the same training step. Click to lock the cursor. Use the slider on a touch screen.

**Closed disclosure: Chart settings and values**

Choose the first and last steps. Select the scale option to fit the loss axis to the selected range.

Hold Shift and drag to zoom.

**Figure 3.2.** Muon weight scale and the BF16 training-loss gap. The ratio view uses an estimate of the proposed update norm.

In the key-projection example, the BF16 weight norm rises early and becomes much larger than the FP32 norm. Muon also develops a large training-loss gap early. The smaller relative update provides a scale-based explanation for this gap.[3]

But weight growth is only one way to reduce the ratio. Even with a fixed norm, the learning rate can still fall.

## Why does the MACRO loss gap increase late in training?

Fixing the weight norm does not fix the relative update throughout training. Recall the idealized MACRO-fro relation $\rho_t=\eta_t$. Cosine decay lowers the learning rate, so it also lowers $\rho_t$.

How much update magnitude might be lost as this ratio falls? We use a simple Gaussian model to connect relative scale with cancellation. The model uses the same ratio $\rho_t$ and estimates the fraction of absolute-update magnitude that remains.[2]

This fraction is **update retention**. It measures how much proposed magnitude survives the model's cancellation rule, not how many coordinates survive. As $\rho_t$ falls, the model retains less of the proposed magnitude.

**Closed disclosure: Inside the cancellation model**

We model a weight coordinate and its proposed update as independent Gaussian variables:

$$
w\sim\mathcal N(0,\sigma_w^2), \qquad \delta\sim\mathcal N(0,\sigma_\delta^2).
$$

Their means are zero. We set their standard deviations to the corresponding matrix RMS norms. This gives the same relative scale as the training analysis:

$$
\frac{\sigma_\delta}{\sigma_w} =\frac{\|\Delta W_t\|_{\mathrm{RMS}}}{\|W_t\|_{\mathrm{RMS}}} =\rho_t.
$$

The model cancels an update when $|\delta|\leq\tau|w|$. It leaves the other updates unchanged:

$$
\delta_\tau=\delta\,\mathbf 1\{|\delta|>\tau|w|\}.
$$

We use $\tau=1/510\approx0.002$ as a BF16 reference. This threshold rule models cancellation, not every effect of BF16 rounding.[2]

The **retained absolute-update fraction** is

$$
\mathcal R(\rho) =\frac{\mathbb E|\delta_\tau|}{\mathbb E|\delta|} =\frac{1}{\sqrt{1+(\tau/\rho)^2}}.
$$

For example, $\mathcal R=0.8$ means that 80% of the proposed absolute-update magnitude remains on average. This is not the fraction of coordinates that survive. The fraction of canceled coordinates is

$$
p_{\mathrm{drop}}(\rho) =\frac{2}{\pi}\arctan\left(\frac{\tau}{\rho}\right).
$$

At $\rho=\tau$, the model cancels half the coordinates but retains about 70.7% of the absolute-update magnitude. The canceled coordinates contribute less magnitude on average.

For the idealized MACRO-fro relation $\rho_t=\eta_t$,

$$
\mathcal R_t^{\mathrm{fro}} =\left[1+\left(\frac{\tau}{\eta_t}\right)^2\right]^{-1/2}.
$$

When $\eta_t$ is much larger than $\tau$, the model retains most of the update magnitude. As $\eta_t$ falls, retention decreases. Thus, fixed weight scale does not remove the effect of learning-rate decay.

Figure 3.3 uses this relation for MACRO-fro. It compares the estimate with measured loss gaps; it does not predict a numerical loss gap. The figure has no MACRO-spec retention curve because matched spectral-factor records are unavailable.

Figure 3.3 applies the model to the MACRO-fro learning-rate schedule. The upper plot shows estimated retention. The lower plot shows measured training-loss gaps for both MACRO variants. Select **Late training** to compare the two patterns.

Retention measures absolute-update magnitude. Cancellation counts coordinates.

MACRO-fro · retained absolute-update fraction

Symlog shows zero and negative gaps, with a linear region from −0.001 to +0.001.

MACRO training-loss gap · BF16 − FP32

Step 9,000MACRO-fro · Loss gap +0.0165MACRO-spec · Loss gap +0.0310Model for MACRO-fro: retained magnitude 9.29% · canceled coordinates 94.07%

**Closed disclosure: Chart settings and values**

**Figure 3.3.** Estimated update retention for MACRO-fro and measured training-loss gaps for both MACRO variants. The two plots show the same training period.

After warmup, the MACRO loss gaps stay small through most of training, then increase near the end. For MACRO-fro, this period also has lower estimated retention. The model helps explain why a small gap can remain even with controlled weight scale.[2]

The constraint does not change BF16 precision. As the learning rate falls, some updates can still become too small.

How much does this matter in the final model? The table compares final validation loss between each method's BF16 and FP32 runs:

$$
\Delta L_{\mathrm{val}}=L_{\mathrm{val}}^{\mathrm{BF16}}-L_{\mathrm{val}}^{\mathrm{FP32}}.
$$

| Optimizer | 240M | 600M |
| --- | --- | --- |
| Muon | +1.1470 | +0.9394 |
| MACRO-fro | +0.0172 | +0.0239 |
| MACRO-spec | +0.0317 | +0.0476 |

Both MACRO variants have a much smaller BF16 penalty in these comparisons.[4]

## Takeaway

**Weight scale affects whether small updates survive rounding. MACRO controls the update-to-weight ratio and shows much less BF16 degradation than Muon in these tests. Learning-rate decay can still leave small updates at risk late in training.**

## Standard Pre-training Results

A smaller BF16 penalty is useful. But does MACRO also improve standard pretraining, and what does it cost?

We started this blog by asking whether a different training recipe could get more from pretraining. We now return to that practical question.

## How does MACRO perform across model sizes?

We train Qwen3 models with 240M, 600M, and 1.2B parameters on C4. Each configuration uses 40 training tokens per parameter and five random seeds. Figure 4.1 compares final validation perplexity (PPL); lower is better.[1]

Figure 4.1 · Standard pre-training

## Final validation perplexity

Lower is better. Select a model size.

**Figure 4.1.** Final validation PPL for standard Qwen3 pre-training. The figure preserves the reported ± values.

Both MACRO variants have lower PPL than Muon at all three tested sizes. The best constrained method varies with model size.[1]

**Closed disclosure: Benchmark details**

The standard benchmark uses Qwen3 models on C4, with TorchTitan as the training framework. Each configuration uses 40 tokens per parameter and five random seeds.[1]

Figure 4.1 retains the reported means and ± values. It compares Muon, MuonH-fro, MuonH-spec, FSO, SSO, MACRO-fro, and MACRO-spec where results are available.

MACRO-spec has the lowest mean PPL at 240M. MuonH-fro has the lowest mean at 600M. MACRO-fro has the lowest mean at 1.2B.

FSO and SSO are not reported at 1.2B. The source attributes this omission to their high per-step costs. Missing results remain labeled **Not reported**.

The 240M efficiency test uses plain implementations without specialized kernels. Metrics are averaged over training steps and five seeds.[2]

**End-to-end step time** measures seconds per training step. **TPS/GPU** reports token throughput per GPU. **MFU** means model FLOPs utilization. Lower step time is better; higher throughput and MFU are better.

## What is the per-step cost?

In [Section 0](#section-0), we chose a single-loop optimizer to keep the testbed practical. What does that choice cost per training step?

Figure 4.2 compares the 240M model using plain implementations without specialized kernels. Start with end-to-end step time. The other views show token throughput and model FLOPs utilization.[2]

Figure 4.2 · 240M efficiency

## Single-loop and double-loop cost

Lower is better.

Plain implementations · no specialized kernels · average over steps and five seeds

**Figure 4.2.** Efficiency for the 240M model. Lower E2E time is better. Higher throughput and MFU are better.

MACRO-fro takes $0.6411$ seconds per step, compared with $0.6311$ for Muon. That is about $10$ ms more, or $1.6\%$. MACRO-spec costs more because its tangent projection and retraction use power iteration. Both MACRO variants remain much faster than the double-loop solvers in this test.[2]

## Does MACRO require learning-rate warmup?

We have already revisited weight decay. One more part of the training recipe is worth checking: how much warmup do these methods need?

Figure 4.3 compares four warmup fractions in the 240M and 600M models. It reports final validation PPL.[3]

Figure 4.3 · Additional training result

## Warmup sensitivity

Lower PPL is better. Lines connect only the tested settings.

Final validation PPL

**Figure 4.3.** Final validation PPL for different warmup fractions. The 600M values at 10% warmup come from author slide 44. Paper Table 12 leaves those entries unreported.

Both MACRO variants give their lowest PPL at $0\%$ warmup in these sweeps. Muon does best at $5\%$ for 240M. At 600M, its results at $0\%$ and $5\%$ are nearly equal. MACRO can therefore train without warmup in the tested configurations.[3]

## Takeaway

**A fixed weight norm does more than limit weight magnitude. It interacts with activation normalization, regulates rotation, and controls the relative scale of low-precision updates. These interactions help explain the benefits of adding constraints, beyond a lower final validation loss.**

## Shared Sources — Sections 3–4

Micikevicius et al., *Mixed Precision Training*, Section 3.1. [Paper](https://arxiv.org/abs/1710.03740). NVIDIA, *Transformer Engine: Introduction*, “Mixed precision” and “Master weights.” [Documentation](https://docs.nvidia.com/deeplearning/transformer-engine-releases/release-2.15/user-guide/features/low_precision_training/introduction/introduction.html). [↩](#s3-mixed-precision-ref1)

[Demystifying Manifold Constraints in LLM Pre-training](#intro-fn:macro), Section 4.3 and Appendices C.5 and D.3; author slides 46, 47, and 65. These sections describe BF16 storage, update ratios, and the cancellation model. [↩](#s3-storage-ref1) [↩](#s3-rounding-ref1) [↩](#s3-rounding-ref2) [↩](#s3-ratio-ref1) [↩](#s3-ratio-ref2) [↩](#s3-ratio-ref3) [↩](#s3-model-ref1) [↩](#s3-model-ref2) [↩](#s3-model-ref3)

The interactive training figures use the supplied matched experiment records. See [Methods and data](#article-methods-panel) for the BF16 master-weight setup, proposed-update estimates, and run details. [↩](#s3-training-ref1) [↩](#s3-training-ref2)

Final BF16 − FP32 validation-loss differences for the matched runs; author slide 45. The table preserves the reported values for 240M and 600M. [↩](#s3-validation-ref1)

*Demystifying Manifold Constraints in LLM Pre-training*, [Section 5, Table 4](https://arxiv.org/html/2605.04418v2#S5), and Appendix D.4: Figure 4.1. Author slide 50 is the visual reference. [↩](#s4-standard-ref1) [↩](#s4-standard-ref2) [↩](#s4-standard-ref3)

The same paper, [Appendix D.4, Table 17](https://arxiv.org/html/2605.04418v2#A4.SS4): Figure 4.2. Author slide 51 is the visual reference. [↩](#s4-efficiency-ref1) [↩](#s4-efficiency-ref2) [↩](#s4-efficiency-ref3)

The same paper, [Appendix D.2, Table 12](https://arxiv.org/html/2605.04418v2#A4.SS2), and author slide 44: Figure 4.3. [↩](#s4-warmup-ref1) [↩](#s4-warmup-ref2)

**Closed disclosure: 600M warmup data at 10%**

The 600M values at 10% warmup come from author slide 44. Paper Table 12 leaves these entries unreported.

Muon: 15.370. MACRO-fro: 15.252. MACRO-spec: 15.300.

