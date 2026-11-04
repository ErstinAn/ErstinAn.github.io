# Section 1 — extracted from latest/index.html

## Manifold Constraints and RMSNorm

The radius analysis in [Section 0](#section-0) links weight scale to the output scale of a linear layer. Weight constraints control weight scale through the radius. RMSNorm can adjust activation scale through its learned parameter $\gamma$. Both mechanisms can therefore affect activation scale, but through different parts of the model.[1]

For an input vector $x$, RMSNorm applies a learned scale $\gamma$:

$$
\operatorname{RMSNorm}(x) = \gamma\odot\frac{x}{\operatorname{RMS}(x)}.
$$

The symbol $\odot$ denotes element-wise multiplication. RMSNorm divides the input by its RMS value, then scales each output coordinate with $\gamma$.

If we increase the constraint radius, does RMSNorm adjust in response? Figure 1.1 tracks $\|\gamma_t\|_2$ across different constraint radii, where $t$ is the training step.

Figure 1.1 · RMSNorm scale

RMSNorm scale norm ‖γₜ‖₂

Compare the curves at the same training step.

**Figure 1.1.** The norm of the learned RMSNorm scale during training, for different constraint radii.

Larger radii correspond to smaller learned values of $\|\gamma_t\|_2$ for both constraints. In other words, RMSNorm adjusts its learned scale in the opposite direction. This compensation can reduce the effect of weight-scale changes on activations.[1]

The two mechanisms therefore have overlapping roles. We next test the constraints after we remove the standard learnable RMSNorm layers.

## Do constraints help without the standard learnable RMSNorm layers?

We use a modified Qwen3-like 330M model for this test. We remove all learnable RMSNorm layers. However, we keep RMS normalization after some nonlinear blocks, including attention blocks. We also keep QK-norm. Weight constraints control the activation scale only indirectly.

We replace SwiGLU with Norm-Gated SwiGLU. It normalizes the Swish branch before the element-wise product. This keeps the output scale of the same order as the output scale of ReLU. The following table shows the ablation architecture.[2]

| Component | Standard model | Modified model |
| --- | --- | --- |
| Standard learnable RMSNorm layers | Present | Removed |
| Feed-forward activation | SwiGLU | Norm-Gated SwiGLU |
| Parameter-free RMSNorm after attention | Absent | Present |

**Closed disclosure: Norm-Gated SwiGLU**

Let $X$ be the input, and let $W_1,W_2$ be the two projection matrices. Define the two branches:

$$
A=\operatorname{Swish}(XW_1^\top), \qquad B=XW_2^\top.
$$

Norm-Gated SwiGLU computes

$$
Y=\frac{A}{\|A\|_{\mathrm{RMS}}}\odot B.
$$

The division controls the RMS scale of the Swish branch before multiplication.[2]

Figure 1.2 compares final validation loss across learning rates from $0.005$. Lower loss is better.

Figure 1.2 · Modified 330M model

Validation loss

Lower loss is better.

**Figure 1.2.** Final validation loss for the modified 330M model. Muon diverges at a learning rate of $0.03$.

Muon diverges at $\eta=0.03$. Both MACRO variants remain finite at all five learning rates. The lowest losses are 2.813 for Muon, 2.758 for MACRO-fro, and 2.739 for MACRO-spec.[3]

These results show that weight constraints improve training stability and validation loss in the ablation architecture.

## How sensitive is training to the radius?

Weight constraints help stabilize training, but our modified model still uses parameter-free normalization. The two mechanisms have overlapping roles, rather than one simply replacing the other.[2]

That overlap may offer another benefit when both mechanisms are present. Recall Figure 1.1: larger radii corresponded to smaller learned RMSNorm scales. This compensation suggests that training may be less sensitive to the radius.[1]

To test this, we return to standard Qwen3 models with learnable RMSNorm. We vary the radius multiplier $r$ in the 240M and 600M models. Each method keeps the same learning rate across radius settings.

Figure 1.3 compares final validation perplexity (PPL) at $r=0.5,1,2,5$. Lower PPL is better.[4]

Figure 1.3 · Standard architecture

Validation perplexity (PPL)

Lower PPL is better.

**Figure 1.3.** Final validation PPL across radius multipliers in the standard architecture with learnable RMSNorm.

At 600M, PPL changes little over $r\in[1,5]$. MACRO-fro ranges from 15.296 to 15.329. MACRO-spec ranges from 15.277 to 15.312. At 240M, MACRO-spec changes more than MACRO-fro across the same range.[4]

This result agrees with the compensation in Figure 1.1. Learned RMSNorm scales can offset changes in weight scale. This helps explain why a range of radii gives similar performance.

## Takeaway

**Manifold constraints and RMSNorm have aligned roles: constraints improve stability in the ablation architecture, while performance with standard RMSNorm is relatively insensitive to the radius multiplier.**

## Shared sources for Section 1

1. *Demystifying Manifold Constraints in LLM Pre-training*, Section 4.1 and Figure 1; presentation slide 36. [https://arxiv.org/html/2605.04418v2#S4.SS1](https://arxiv.org/html/2605.04418v2#S4.SS1)
2. The same paper, Section 4.1, Equation (4), Table 1, and Appendix D.1; presentation slide 37. [https://arxiv.org/html/2605.04418v2#A4.SS1](https://arxiv.org/html/2605.04418v2#A4.SS1)
3. The same paper, Table 2; presentation slide 38. [https://arxiv.org/html/2605.04418v2#S4.T2](https://arxiv.org/html/2605.04418v2#S4.T2)
4. The same paper, Table 3; the selected fixed-learning-rate settings match presentation slide 39. [https://arxiv.org/html/2605.04418v2#S4.T3](https://arxiv.org/html/2605.04418v2#S4.T3)
