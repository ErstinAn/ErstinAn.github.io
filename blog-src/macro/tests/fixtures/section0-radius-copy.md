<!--
SECTION 0 — EDITORIAL DRAFT v2
This is replacement copy, not an implementation request.
Scope: the brief callback after the constraint definitions; subsections 03 and 04.
Keep the accepted optimizer text and Figure 0.1 unchanged.
Chinese placement notes and HTML comments are not reader copy.
-->

<!-- A. Insert after the two constraint definitions. Remove the main-text diagonal-circle/square example. -->

Both constraints act on the whole matrix. Later, we will ask whether each row or column needs its own norm constraint.

<!-- B. Replace subsection 03. -->

## How do we choose the radius?

We now have a constraint and an update rule. But how large should the constraint be?

The same radius can mean different things for different matrices. The Frobenius norm combines squared values from all entries. The spectral norm measures the largest stretch along an input direction. So we choose the radius from the layer's effect on its inputs, not from the norm value alone.

Our aim is to control activation scale as layer widths change. This shares a goal with width-aware parameterizations such as μP.[^spectral-mup]

Consider the linear layer \(Y=XW_0^\top\). Let \(r_X\) and \(r_Y\) be the RMS values of its inputs and outputs. We choose dimension-dependent radii and leave a separate multiplier \(r>0\) for tuning. For normalized Gaussian initialization, the rules are:[^macro-radius]

<!-- Render the next table as two compact columns, without outer boxes or row labels. -->

| Frobenius | Spectral |
| :---: | :---: |
| \(R_{\mathrm{fro}}=r\sqrt p\) | \(R_{\mathrm{spec}}=r\sqrt{p/n}\) |
| Expected squared output RMS: \(\mathbb E_G[r_Y^2\mid X]=r^2r_X^2\). | Output RMS bound: \(r_Y=r\,r_X\quad\text{with high probability}\). |

For the assumptions and probability bounds, open Proposition 1 below. The formulas account for the input dimension \(n\) and output dimension \(p\). The multiplier \(r\) is independent of these dimensions. Does this extra hyperparameter make constraints harder to use? In [Section 1](#section-1), we show that training is robust to changes in this multiplier when RMSNorm and weight constraints work together.

<details id="s0-radius-proposition">
<summary>Proposition 1: Radius selection at initialization</summary>

Let \(T,n,p\geq1\), \(r>0\), and \(X\in\mathbb R^{T\times n}\). Define

\[
r_X=\frac{\|X\|_F}{\sqrt{Tn}},
\qquad
r_Y=\frac{\|XW_0^\top\|_F}{\sqrt{Tp}}.
\]

Let \(G\in\mathbb R^{p\times n}\) have independent standard normal entries. The matrix \(G\) is independent of \(X\).

**Frobenius constraint.** Set

\[
W_0=r\sqrt p\,\frac{G}{\|G\|_F}.
\]

Then

\[
\mathbb E_G[r_Y^2\mid X]=r^2r_X^2.
\]

**Spectral constraint.** Set

\[
W_0=r\sqrt{\frac pn}\,\frac{G}{\|G\|_2}.
\]

The output satisfies the deterministic bound

\[
r_Y\leq r\,r_X.
\]

For any \(\varepsilon\in(0,1)\) and \(a>0\),

\[
r_Y\geq
\frac{r\sqrt{1-\varepsilon}}{\sqrt{n/p}+1+a}\,r_X
\]

with conditional probability at least

\[
1-\exp(-p\varepsilon^2/4)-\exp(-a^2p/2).
\]

The probability is over \(G\), for a fixed \(X\).

Theorem 2 in Appendix C.2 gives concentration bounds for both initializations. With \(r,r_X=\Theta(1)\) and \(n/p=O(1)\), these bounds give \(r_Y=\Theta(1)\) with high probability as the widths grow. The aspect-ratio condition is stated in Remark 1 of that appendix.[^macro-radius]

</details>

<!-- C. Replace subsection 04. Definitions and conclusion remain visible. -->

## What if we constrain each row or column?

Earlier, we fixed one norm for the whole matrix. Would finer control help?

The Frobenius sphere fixes the total squared norm. It does not fix how that total is divided among rows or columns. **Oblique manifolds** add constraints at this finer level. An **output-oblique** constraint gives every row the same fixed norm. An **input-oblique** constraint does the same for columns.[^macro-oblique]

We match each oblique variant to the same total Frobenius norm as MACRO-fro. This keeps the overall scale fixed while changing how it is shared.

In these tests, neither oblique variant improves validation loss over the matched Frobenius sphere. We therefore focus on the Frobenius and spectral spheres in the following sections.[^macro-oblique]

<details id="s0-oblique-details">
<summary>Compare Frobenius and oblique constraints</summary>

The matched radii are

| Constraint | Required norm | Radius |
| --- | --- | --- |
| Frobenius sphere | One norm for the matrix | \(R_{\mathrm{fro}}=r\sqrt p\) |
| Output-oblique | One fixed norm for every row | \(R_{\mathrm{out}}=r\) |
| Input-oblique | One fixed norm for every column | \(R_{\mathrm{in}}=r\sqrt{p/n}\) |

Each choice gives \(\|W\|_F^2=r^2p\). The first panel compares validation loss at each tested learning rate. Positive differences mean that the oblique variant has higher loss. The second panel compares maximum row norms during training.

<!-- KEEP THE EXISTING Figure 0.2, ITS DATA, CONTROLS, NUMERICAL DEFINITIONS, AND CAPTION. -->

Neither oblique variant reduces validation loss in this comparison. MACRO-fro and MACRO-iobl also show similar maximum row norms during training.[^macro-oblique]

</details>

<!-- D. Use once as the final transition of Section 0, after the accepted takeaway if one is present. Do not duplicate it elsewhere. -->

With the constraints and radii in place, we can return to the question from the introduction. RMSNorm already rescales activations. What changes when we also fix weight scale?

[^macro-radius]: An et al., *Demystifying Manifold Constraints in LLM Pre-training*, Section 3.2, Proposition 1, and Appendix C.2, Theorem 2 and Remark 1. https://arxiv.org/html/2605.04418v2#S3.SS2 . Notation is adapted to the blog. The aspect-ratio condition is taken from Remark 1; it is not an added claim of uniform behavior over all matrix shapes.
[^macro-oblique]: The same paper, Section 2, Section 3.2, and Appendix D.5; author slides 34–35. https://arxiv.org/html/2605.04418v2#A4.SS5 . Preserve the existing plots and their source records.
[^spectral-mup]: Yang, Simon, and Bernstein, *A Spectral Condition for Feature Learning*, Sections 1.1, 3, and 5.1. https://arxiv.org/html/2310.17813 . The analogy concerns width-aware scale control. The radius proposition alone is not a proof of full μP equivalence or hyperparameter transfer.
