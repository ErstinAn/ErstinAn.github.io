# Section 0 — extracted from latest/index.html

## Preparation: Candidate Constraints and the Optimizer

Before we explore what weight constraints change, let's define the training problem and choose an optimizer.

Let $W\in\mathbb R^{p\times n}$ be a weight matrix. Its input dimension is $n$, and its output dimension is $p$. We minimize the training loss $\mathcal L(W)$, while keeping $W$ in a constraint set $\mathcal M$:

$$
\min_{W\in\mathcal M}\mathcal L(W).
$$

We start with two ways to fix matrix scale. The Frobenius norm is the square root of the sum of squared entries. The spectral norm is the largest singular value. It measures the largest factor by which the matrix can stretch an input vector.

The two constraint sets are

$$
\mathcal M_F(R)=\{W:\|W\|_F=R\}, \qquad \mathcal M_S(R)=\{W:\|W\|_2=R\}.
$$

The radius $R>0$ sets the required norm. Both constraints leave the individual entries free to change.

Both constraints act on the whole matrix. Later, we will ask whether each row or column needs its own norm constraint.

To train under these constraints, we propose the Msign-Aligned Constrained Riemannian Optimizer (MACRO). Its two variants are MACRO-fro and MACRO-spec.

Why not simply use MuonH or SSO? We want a practical testbed with a convergence guarantee. MuonH normalizes weights and updates, without an explicit tangent-space projection. SSO solves a constrained direction problem through an inner iterative search.

MACRO builds on the MCSD approach to balance manifold optimization with training cost. It uses a single-loop update, with a convergence guarantee under the paper's assumptions. Here is how the pieces fit together.

## How does MACRO update the weights?

At step $t$, MACRO forms momentum $M_t$ from the current gradient and previous momentum. It then projects $M_t$ onto the tangent space at $W_t$, giving $\Phi_t$. This explicit projection distinguishes MACRO from MuonH and is central to our convergence analysis.

MACRO then follows the spectral steepest-descent framework to compute the update direction:

$$
O_t=\operatorname{msign}(\Phi_t).
$$

For a full-rank matrix, this operation keeps the singular vectors and sets the singular values to one.

Next, we scale this direction with the constraint radius:

$$
\widetilde{\nabla}_t = \frac{R\,O_t}{\|O_t\|_{\mathcal M}+\epsilon}.
$$

Here, $\|\cdot\|_{\mathcal M}$ is the Frobenius norm for MACRO-fro and the spectral norm for MACRO-spec.

The constraint fixes the weight scale. This rescaling controls the proposed update size relative to it. We return to this update-to-weight ratio in Section 3, where small updates can disappear during rounding.

We then take a step with learning rate $\eta_t$. A retraction returns the candidate weights to the constraint set:

$$
W_{t+1} = \mathcal P_{\mathcal M}\bigl(W_t-\eta_t\widetilde{\nabla}_t\bigr).
$$

Explore the five stages below to see what each part contributes.

## Figure 0.1

Select a stage to see its role.

### 1. Momentum

$$
M_t=\beta M_{t-1}+(1-\beta)G_t.
$$

Compute the exponential moving average of the gradients.

### 2. Tangent projection

$$
\Phi_t=\Pi_{T_{W_t}\mathcal M}(M_t).
$$

Project the momentum onto the tangent space at $W_t$.

This projection is central to our convergence analysis.

### 3. Orthogonalize

$$
\Phi_t=U\Sigma V^\top, \qquad O_t=\operatorname{msign}(\Phi_t)=UV^\top.
$$

Form $O_t=UV^\top$ from the singular vectors of $\Phi_t$.

This gives the direction for a spectral steepest-descent step.

### 4. Rescale

$$
\widetilde{\nabla}_t= \frac{R O_t}{\|O_t\|_{\mathcal M}+\epsilon}.
$$

Scale the update direction using the radius $R$.

This controls the proposed step size relative to the weight scale.

### 5. Retract

$$
Z_t=W_t-\eta_t\widetilde{\nabla}_t, \qquad W_{t+1}=\mathcal P_{\mathcal M}(Z_t).
$$

Map the updated weights back to the constraint set.

The next step starts from weights that satisfy the constraint.

**Closed disclosure: Convergence result**

Theorem 1 gives a convergence bound under the stated assumptions. With the specified learning rate and momentum, the bound is $O(T^{-1/4})$ after $T$ steps. This matches the rate for stochastic optimization of general smooth, nonconvex functions.

## How do we choose the radius?

We now have a constraint and an update rule. But how large should the constraint be?

The same radius can mean different things for different matrices. The Frobenius norm combines squared values from all entries. The spectral norm measures the largest stretch along an input direction. So we choose the radius from the layer's effect on its inputs, not from the norm value alone.

Our aim is to control activation scale as layer widths change. This shares a goal with width-aware parameterizations such as μP.

Consider the linear layer $Y=XW_0^\top$. Let $r_X$ and $r_Y$ be the RMS values of its inputs and outputs. We choose dimension-dependent radii and leave a separate multiplier $r>0$ for tuning. For normalized Gaussian initialization, the rules are:

## Frobenius

$$
R_{\mathrm{fro}}=r\sqrt p
$$

Expected squared output RMS:

$$
\mathbb E_G[r_Y^2\mid X]=r^2r_X^2
$$

## Spectral

$$
R_{\mathrm{spec}}=r\sqrt{p/n}
$$

Output RMS bound:

$$
r_Y=r\,r_X\quad\text{with high probability}
$$

For the assumptions and probability bounds, open Proposition 1 below. The formulas account for the input dimension $n$ and output dimension $p$. The multiplier $r$ is independent of these dimensions. Does this extra hyperparameter make constraints harder to use? In Section 1, we show that training is robust to changes in this multiplier when RMSNorm and weight constraints work together.

**Closed disclosure: Proposition 1: Radius selection at initialization**

Let $T,n,p\geq1$, $r>0$, and $X\in\mathbb R^{T\times n}$. Define

$$
r_X=\frac{\|X\|_F}{\sqrt{Tn}}, \qquad r_Y=\frac{\|XW_0^\top\|_F}{\sqrt{Tp}}.
$$

Let $G\in\mathbb R^{p\times n}$ have independent standard normal entries. The matrix $G$ is independent of $X$.

Frobenius constraint. Set

$$
W_0=r\sqrt p\,\frac{G}{\|G\|_F}.
$$

Then

$$
\mathbb E_G[r_Y^2\mid X]=r^2r_X^2.
$$

Spectral constraint. Set

$$
W_0=r\sqrt{\frac pn}\,\frac{G}{\|G\|_2}.
$$

The output satisfies the deterministic bound

$$
r_Y\leq r\,r_X.
$$

For any $\varepsilon\in(0,1)$ and $a>0$,

$$
r_Y\geq \frac{r\sqrt{1-\varepsilon}}{\sqrt{n/p}+1+a}\,r_X
$$

with conditional probability at least

$$
1-\exp(-p\varepsilon^2/4)-\exp(-a^2p/2).
$$

The probability is over $G$, for a fixed $X$.

Theorem 2 in Appendix C.2 gives concentration bounds for both initializations. With $r,r_X=\Theta(1)$ and $n/p=O(1)$, these bounds give $r_Y=\Theta(1)$ with high probability as the widths grow. The aspect-ratio condition is stated in Remark 1 of that appendix.

## What if we constrain each row or column?

Earlier, we fixed one norm for the whole matrix. Would finer control help?

The Frobenius sphere fixes the total squared norm. It does not fix how that total is divided among rows or columns. Oblique manifolds add constraints at this finer level. An output-oblique constraint gives every row the same fixed norm. An input-oblique constraint does the same for columns.

We match each oblique variant to the same total Frobenius norm as MACRO-fro. This keeps the overall scale fixed while changing how it is shared.

In these tests, neither oblique variant improves validation loss over the matched Frobenius sphere. We therefore focus on the Frobenius and spectral spheres in the following sections.

**Closed disclosure: Compare Frobenius and oblique constraints**

The matched radii are

| Constraint | Required norm | Radius |
| --- | --- | --- |
| Frobenius sphere | One norm for the matrix | $R_{\mathrm{fro}}=r\sqrt p$ |
| Output-oblique | One fixed norm for every row | $R_{\mathrm{out}}=r$ |
| Input-oblique | One fixed norm for every column | $R_{\mathrm{in}}=r\sqrt{p/n}$ |

Each choice gives $\|W\|_F^2=r^2p$. The first panel compares validation loss at each tested learning rate. Positive differences mean that the oblique variant has higher loss. The second panel compares maximum row norms during training.

(a)

Validation-loss difference from MACRO-fro

Validation-loss difference

Positive values mean that the oblique method has higher validation loss.

Select a point to see the loss values.

(b)

Maximum row norm during training

Maximum row norm

Select a curve to highlight it.

Figure 0.2. (a) Validation-loss differences from MACRO-fro. (b) Maximum row norms for MACRO-fro and MACRO-iobl during training.

Neither oblique variant reduces validation loss in this comparison. MACRO-fro and MACRO-iobl also show similar maximum row norms during training.

With the constraints and radii in place, we can return to the question from the introduction. RMSNorm already rescales activations. What changes when we also fix weight scale?

