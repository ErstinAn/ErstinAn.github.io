<!-- REVIEW DRAFT ONLY. Replace the opening and algorithm text in Section 0.
Do not change subsection 03 (radius selection), subsection 04, or other chapters.
Remove the old lead question and the visible '01 / What do we constrain?' heading.
The constraint illustration below is a proposal, not an instruction to implement it yet.
Keep the existing Section 0 anchor. -->

# Preparation: Candidate Constraints and the Optimizer

Before we explore what weight constraints change, let's define the training problem and choose an optimizer.

Let \(W\in\mathbb R^{p\times n}\) be a weight matrix. Its input dimension is \(n\), and its output dimension is \(p\). We minimize the training loss \(\mathcal L(W)\), while keeping \(W\) in a constraint set \(\mathcal M\):

\[
\min_{W\in\mathcal M}\mathcal L(W).
\]

We start with two ways to fix matrix scale. The **Frobenius norm** is the square root of the sum of squared entries. The **spectral norm** is the largest singular value. It measures the largest factor by which the matrix can stretch an input vector.

The two constraint sets are

\[
\mathcal M_F(R)=\{W:\|W\|_F=R\},
\qquad
\mathcal M_S(R)=\{W:\|W\|_2=R\}.
\]

The radius \(R>0\) sets the required norm. Both constraints leave the individual entries free to change.[^constraints]

<!-- OPTIONAL CONSTRAINT VISUAL: one compact, two-panel comparison.
See the blueprint. Do not number it or build it before the design is agreed.
Do not restore the deleted radius calculator. -->

To train under these constraints, we propose the **Msign-Aligned Constrained Riemannian Optimizer (MACRO)**. Its two variants are **MACRO-fro** and **MACRO-spec**.

Why not simply use MuonH or SSO? We want a practical testbed with a convergence guarantee. MuonH normalizes weights and updates, without an explicit tangent-space projection. SSO solves a constrained direction problem through an inner iterative search.[^hyperball][^sso]

MACRO builds on the MCSD approach to balance manifold optimization with training cost. It uses a single-loop update, with a convergence guarantee under the paper's assumptions. Here is how the pieces fit together.[^mcsd][^macro]

## How does MACRO update the weights?

At step \(t\), MACRO forms momentum \(M_t\) from the current gradient and previous momentum. It then projects \(M_t\) onto the tangent space at \(W_t\), giving \(\Phi_t\). This explicit projection distinguishes MACRO from MuonH and is central to our convergence analysis.[^macro][^hyperball]

MACRO then follows the spectral steepest-descent framework to compute the update direction:

\[
O_t=\operatorname{msign}(\Phi_t).
\]

For a full-rank matrix, this operation keeps the singular vectors and sets the singular values to one.

Next, we scale this direction with the constraint radius:

\[
\widetilde{\nabla}_t
=
\frac{R\,O_t}{\|O_t\|_{\mathcal M}+\epsilon}.
\]

Here, \(\|\cdot\|_{\mathcal M}\) is the Frobenius norm for MACRO-fro and the spectral norm for MACRO-spec.

The constraint fixes the weight scale. This rescaling controls the proposed update size relative to it. We return to this **update-to-weight ratio** in [Section 3](#section-3), where small updates can disappear during rounding.[^macro]

We then take a step with learning rate \(\eta_t\). A **retraction** returns the candidate weights to the constraint set:

\[
W_{t+1}
=
\mathcal P_{\mathcal M}\bigl(W_t-\eta_t\widetilde{\nabla}_t\bigr).
\]

Explore the five stages below to see what each part contributes.[^algorithm]

<!-- EXISTING FIGURE 0.1: retain formulas and controls; replace the stage text
with Part B of the blueprint. Keep the small top label 'Figure 0.1'.
Delete the visible bottom caption 'Figure 0.1. The five stages of a MACRO update.'
Do not repeat the algorithm summary after the component. -->

<!-- Keep the existing, default-closed 'Convergence result' note unchanged.
END OF REPLACEMENT: subsection 03 and everything after it remain unchanged. -->

[^constraints]: Author slides, *PostDoc_presentation(1).pdf*, slide 32; *Demystifying Manifold Constraints in LLM Pre-training*, Section 2. https://arxiv.org/html/2605.04418v2#S2
[^hyperball]: Wen et al., *Fantastic Pretraining Optimizers and Where to Find Them II: Hyperball Optimization*, Section 2, v2. https://arxiv.org/html/2606.16899v2#S2
[^sso]: Xie et al., *Controlled LLM Training on Spectral Sphere*, Sections 3.2 and 5.1. https://arxiv.org/html/2601.08393v3
[^mcsd]: Yang and Lai, *Manifold constrained steepest descent for smooth and closed-set optimization*, Section 3.1, v2. https://arxiv.org/html/2601.21487v2
[^macro]: An et al., *Demystifying Manifold Constraints in LLM Pre-training*, Section 3.1, Algorithm 1, Theorem 1, and Appendix C.1. The relation to MCSD is stated in Appendix C.1. https://arxiv.org/html/2605.04418v2#S3.SS1
[^algorithm]: Author slides, *PostDoc_presentation(1).pdf*, slide 33; the same paper, Algorithm 1. https://arxiv.org/html/2605.04418v2#alg1
