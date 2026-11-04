# Section 2 — extracted from latest/index.html

## Manifold Constraints and Weight Decay

RMSNorm is not the only part of the training recipe that controls scale. Weight decay acts directly on the weights. If we now fix their norm, what is left for weight decay to do?

## How does weight decay affect rotation?

To see the connection, consider one weight matrix as a vector $w_t$. Let $s_t$ be its optimizer increment, including the learning rate but not weight decay. The update is

$$
w_{t+1}=(1-\eta\lambda)w_t+s_t,
$$

where $\eta$ is the learning rate and $\lambda$ is the decay coefficient.

The increment can change both the size and direction of the weights. We split it into a radial component $s_t^\parallel$, parallel to $w_t$, and a tangential component $s_t^\perp$, perpendicular to it. Weight decay combines with the radial component. Figure 2.1 shows the same step before and after this split.

Figure 2.1 · Radial and tangential updates

## (a) Optimizer update and decay

Add the optimizer update and the weight-decay update.

## (b) Radial and tangential components

Combine the radial component with weight decay. Keep the tangential component unchanged.

**Figure 2.1.** Two views of the same step. Weight decay combines with the radial component. The arc marks the initial norm.

The tangential component turns the weight vector. A finite tangential step can also increase its norm. For a small total step, the rotation angle in radians is approximately

$$
\theta_t\approx\frac{\|s_t^\perp\|_2}{\|w_t\|_2}.
$$

The same tangential update gives a larger angle when the weight norm is smaller. So weight scale also affects how far the weights turn.

What happens to that scale over many steps? In fixed-learning-rate experiments, Kosson et al. observed stable weight norms and average rotation after an initial transient.[2]

A simple random-update model illustrates how this balance can form. Under its assumptions, the expected squared weight norm approaches a fixed level. This is a balance that develops during training, not a norm enforced after every step.

**Closed disclosure: A simple model of norm equilibrium**

We use a random-update model to explain the balance. The model uses a fixed learning rate and a fixed decay coefficient.

Let $s_t$ be the update before weight decay. The weight update is

$$
w_{t+1}=bw_t+s_t, \qquad b=1-\eta\lambda, \qquad 0<b<1.
$$

The model uses two conditions at every step:

$$
\mathbb E\langle w_t,s_t\rangle=0, \qquad \mathbb E\|s_t\|_2^2=S^2<\infty.
$$

The expectation is over different sequences of random updates. The first condition sets the expected inner product to zero. Individual updates need not be perpendicular to the weight.

The second condition keeps the expected value of $\|s_t\|_2^2$ constant across steps. Individual update sizes can still change.

Let $Q_t=\mathbb E\|w_t\|_2^2$, with $Q_0<\infty$. The update equation gives

$$
\begin{aligned} Q_{t+1} &=b^2Q_t+2b\,\mathbb E\langle w_t,s_t\rangle +\mathbb E\|s_t\|_2^2\\ &=b^2Q_t+S^2. \end{aligned}
$$

Thus,

$$
Q_{t+1}-Q_t = \underbrace{S^2}_{\text{increase from updates}} - \underbrace{(1-b^2)Q_t}_{\text{decrease from decay}}.
$$

The balance point is

$$
Q_*=\frac{S^2}{1-b^2}.
$$

When $Q_t<Q_*$, the increase is more than the decrease. When $Q_t>Q_*$, the decrease is more than the increase.

The difference from the balance point satisfies

$$
Q_t-Q_*=b^{2t}(Q_0-Q_*).
$$

Because $0<b<1$, the absolute difference decreases to zero. This result concerns the expected squared norm. The norm can still change at each step.

MACRO takes a different route: it fixes the required norm after each update. Recall from [Section 0](#section-0) that it also scales the proposed update with this norm. Together, these choices give us a more direct way to control rotation.

## How does the Frobenius constraint control rotation?

Start with MACRO-fro. It keeps $\|W_t\|_F=R$ and scales the proposed step to approximately $\eta_tR$ in the same norm. Retraction restores the radius without changing the candidate's direction.

We measure the angle between consecutive weight matrices, treating each matrix as a vector. For a small step that is nearly perpendicular to $W_t$,

$$
\theta_t^{\mathrm{fro}}\approx\frac{\eta_tR}{R}=\eta_t.
$$

The radius cancels. Under these conditions, a fixed step size gives a nearly fixed angle.[3] Figure 2.2 checks this prediction across different fixed step sizes.

Figure 2.2 · Frobenius constraint

## Whole-matrix rotation

Rotation angle (rad)

Select a curve to inspect its rotation angle.

**Figure 2.2.** Whole-matrix rotation under the Frobenius constraint, at different fixed step sizes.

The reported angles remain nearly constant at each setting. Larger step sizes give larger angles. The paper calls this **static global rotation**: the whole-matrix angle stays nearly steady in these runs.[3]

**Closed disclosure: The exact Frobenius angle**

Let $\|W_t\|_F=R$. The whole-matrix angle is

$$
\theta_t^{\mathrm{fro}} = \arccos\!\left( \frac{\langle W_{t+1},W_t\rangle_F} {\|W_{t+1}\|_F\|W_t\|_F} \right).
$$

Let $O_t$ be the matrix-sign direction from Section 0. Define its alignment with the weights:

$$
\alpha_t= \frac{\langle W_t,O_t\rangle_F}{R\|O_t\|_F}.
$$

For the normalized update without the small numerical stabilizer, Appendix C.3 gives

$$
\cos\theta_t^{\mathrm{fro}} = \frac{1-\eta_t\alpha_t} {\sqrt{1-2\eta_t\alpha_t+\eta_t^2}}.
$$

For small $\eta_t$,

$$
\theta_t^{\mathrm{fro}} \approx\eta_t\sqrt{1-\alpha_t^2}.
$$

When $|\alpha_t|$ is also small, this reduces to $\theta_t^{\mathrm{fro}}\approx\eta_t$. The approximation therefore uses both a small step and small alignment.[3]

## How does the spectral constraint change rotation?

Does fixing the largest singular value give the same kind of control? The strongest stretch is fixed, but the input and output directions associated with it can still change.

Here, we track the leading right singular vector $v_t$, the input direction that the matrix stretches most. The leading left singular vector $u_t$ gives the corresponding output direction. We measure how these directions change between steps, rather than the whole-matrix angle used above.

The spectral gap separates the largest and second singular values. A smaller gap permits larger changes in the leading directions for the same step size. Their rotation can therefore depend on the changing spectrum, not only on the learning rate.[4]

Figure 2.3 follows these input and output directions during training.

Figure 2.3 · Spectral constraint

## Leading singular-direction rotation

## Left singular direction u

Principal angle (rad)

## Right singular direction v

Principal angle (rad)

Compare the left and right angles at the same setting.

**Figure 2.3.** Rotation of the leading left and right singular directions under the spectral constraint.

The measured angles vary during training, with similar trends on the left and right. The paper calls this **adaptive subspace rotation**.[4] Fixing a norm does not give both constraints the same rotation behavior.

**Closed disclosure: How we measure spectral rotation**

Let $u_t$ and $v_t$ be the leading left and right singular vectors of $W_t$. The spectral constraint gives

$$
W_tv_t=R\,u_t.
$$

We measure their changes by

$$
\theta_{u,t}=\arccos\!\left(|u_{t+1}^{\top}u_t|\right), \qquad \theta_{v,t}=\arccos\!\left(|v_{t+1}^{\top}v_t|\right).
$$

The absolute values treat opposite signs as the same singular direction. These angles are different from the whole-matrix angle in Figure 2.2.

Set $\theta_t^{\mathrm{spec}}=\max\{\theta_{u,t},\theta_{v,t}\}$. For small angles, the paper gives the estimate

$$
\theta_t^{\mathrm{spec}} \lesssim \eta_t\frac{R}{R-\sigma_2(W_{t+1})}.
$$

Here, $\sigma_2$ is the second singular value. The denominator is the positive spectral gap used in this estimate. A smaller gap permits a larger rotation for the same step size. This is an estimate, not an equality.[4]

## Does weight decay still improve training?

We can now return to the question at the start. Once the constraint controls weight scale, does weight decay still add a benefit?

We compare $\lambda=0$ and $\lambda=0.1$ on a 330M Qwen3-like model. Each pair uses the same learning rate and all other settings. The table reports validation loss.

**Table 2.1.** Each cell shows loss without decay / loss with decay.

| Optimizer | $\eta=0.007$ | $\eta=0.010$ | $\eta=0.030$ |
| --- | --- | --- | --- |
| MACRO-fro | 2.742 / 2.742 | 2.730 / 2.729 | 2.718 / 2.718 |
| MACRO-spec | 2.728 / 2.727 | 2.715 / 2.715 | 2.783 / 2.783 |

The paired losses differ by at most $0.001$ at the reported precision. Additional weight decay gives little benefit in these tests.[5]

**Closed disclosure: Other constrained optimizers**

The paper also tests MuonH-fro and MuonH-spec with the same decay settings.

| Optimizer | $\eta=0.007$ | $\eta=0.010$ | $\eta=0.030$ |
| --- | --- | --- | --- |
| MuonH-fro | 2.740 / 2.740 | 2.722 / 2.722 | 2.717 / 2.717 |
| MuonH-spec | 2.728 / 2.729 | 2.715 / 2.715 | 2.766 / 2.766 |

These paired losses also differ by at most $0.001$.[5]

**Closed disclosure: Weight-decay tuning for Muon**

A separate 240M experiment varies both the learning rate and weight decay for Muon. The table reports validation perplexity (PPL).

| Learning rate | $\lambda=0.01$ | $\lambda=0.05$ | $\lambda=0.10$ | $\lambda=0.50$ |
| --- | --- | --- | --- | --- |
| 0.008 | 21.348 | 21.020 | **20.845** | 21.168 |
| 0.016 | 20.972 | 20.680 | **20.676** | 21.874 |
| 0.032 | 20.691 | **20.583** | 20.848 | 23.345 |

The best tested decay coefficient changes with the learning rate. The lowest Muon PPL is 20.583. MACRO-fro reaches 20.579 without decay on the constrained matrices. MACRO-spec reaches 20.502.[6]

## Takeaway

**MACRO fixes weight scale after each update. Frobenius constraints give nearly steady whole-matrix angles in the fixed-step runs. Spectral constraints allow changing leading-direction angles. Additional weight decay gives little benefit in these tests.**

So far, we have asked how far the weights turn. Next, we ask whether a small proposed update changes the stored weight at all.

## Shared Sources — Section 2

Loshchilov and Hutter, *Decoupled Weight Decay Regularization* (2019). [https://arxiv.org/abs/1711.05101](https://arxiv.org/abs/1711.05101)

Kosson, Messmer, and Jaggi, *Rotational Equilibrium: How Weight Decay Balances Learning Across Neural Networks* (ICML 2024). Figure 3 provides the empirical example. Sections 3.1–3.2 discuss geometry and AdamW. [https://arxiv.org/html/2305.17212v4](https://arxiv.org/html/2305.17212v4) [↩](#s2-fnref:rotation)

*Demystifying Manifold Constraints in LLM Pre-training*, Section 4.2, Figure 2, and Appendix C.3; author slides 40–41. [https://arxiv.org/html/2605.04418v2#S4.SS2](https://arxiv.org/html/2605.04418v2#S4.SS2) [↩](#s2-fnref:fro)[↩](#s2-fnref2:fro)[↩](#s2-fnref3:fro)

The same paper, Section 4.2, Figure 3, and Appendix C.4; author slide 42. [https://arxiv.org/html/2605.04418v2#A3.SS4](https://arxiv.org/html/2605.04418v2#A3.SS4) [↩](#s2-fnref:spec)[↩](#s2-fnref2:spec)[↩](#s2-fnref3:spec)

The same paper, Appendix D.2, Table 10; author slide 43. [https://arxiv.org/html/2605.04418v2#A4.SS2](https://arxiv.org/html/2605.04418v2#A4.SS2) [↩](#s2-fnref:ablation)[↩](#s2-fnref2:ablation)

The same paper, Appendix D.2, Table 11. [https://arxiv.org/html/2605.04418v2#A4.SS2](https://arxiv.org/html/2605.04418v2#A4.SS2) [↩](#s2-fnref:muon)

