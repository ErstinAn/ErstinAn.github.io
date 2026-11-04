# Introduction — extracted from latest/index.html

In 2026, the open-weight model Kimi K3 has about **2.8 trillion total parameters**.[1] Pretraining is still scaling. But data and compute are not unlimited. The training recipe deserves as much attention as model size. Can we get more from pretraining by changing how weights learn, rather than only adding data or compute?

One clue comes from the weights themselves. Kaiyue Wen reported an unusual pattern in Muse Glimmer: the matrices he examined had nearly the same root-mean-square (RMS) value, about **0.006**, across layers and matrix types. RMS measures the typical size of their entries.[2]

*Image alt text:* Screenshot of Kaiyue Wen's post reporting near-constant per-matrix weight RMS in Muse Glimmer.

[Kaiyue Wen's post](https://x.com/wen_kaiyue/status/2086869377442369620) about weight scales in Muse Glimmer.

The comparison below shows the weight-RMS patterns in Qwen3-8B and Muse Glimmer.

**Closed disclosure:** Comparison between Qwen3-8B and Muse Glimmer

In these plots, weight RMS varies across Qwen3-8B layers and matrix types. Muse Glimmer shows a much more uniform pattern near 0.006.

Qwen3-8B

*Image alt text:* Qwen3-8B weight RMS varies across layers and matrix types; its vertical-axis range is larger than the Muse plot's.

**Closed disclosure:** View larger image · scroll to inspect

*Image alt text:* Qwen3-8B weight RMS: enlarged view of the same original chart.

Qwen3-8B: weight RMS by layer and matrix type. From [the same thread](https://x.com/wen_kaiyue/status/2086869383674986890).

Muse Glimmer

*Image alt text:* Muse-Glimmer-30B weight RMS: the plotted matrix types stay near 0.006 across layers.

**Closed disclosure:** View larger image · scroll to inspect

*Image alt text:* Muse-Glimmer-30B weight RMS: enlarged view of the same original chart.

Muse-Glimmer-30B: weight RMS by layer and matrix type. From [Kaiyue Wen's post](https://x.com/wen_kaiyue/status/2086869377442369620).

The plots use different vertical-axis ranges. Compare the patterns and labeled values, not bar heights alone.

Why might keeping weight scale fixed help a model learn? That's the puzzle we want to explore.

Normalization itself is not new. What matters here is *what* we normalize. LayerNorm and RMSNorm act on activations—the signals passed through a model. Other methods act on the updates or the weights themselves.[3][4]

**What are we normalizing?**

| Object | Examples |
| --- | --- |
| **Activations** — signals inside the model | LayerNorm and RMSNorm normalize activations. nGPT also normalizes hidden states.[3][4][5] |
| **Updates** — proposed changes to weights | Muon approximately orthogonalizes momentum matrices. Mano uses row- and column-wise geometry to project and normalize momentum.[6][7] |
| **Weights** — parameters learned during training | nGPT normalizes parameter vectors. MuonH fixes matrix Frobenius norms, while SSO fixes spectral norms.[5][8][9] |

Some methods act on more than one object. Hyperball and SSO, for example, also control update norms.[8][9]

But adding a weight constraint is more than a rescaling trick. The entries can still change, but not in every possible way. Take the Stiefel constraint discussed in Thinking Machines Lab's *Modular Manifolds*. It keeps a matrix's columns orthonormal: perpendicular to each other and unit length. Such a matrix cannot become rank-deficient and collapse an input direction to zero. This restricts the transformations the layer can learn, not just the size of its weights.[11]

Different constraints leave different kinds of freedom. When the allowed weights form a smooth manifold, training becomes a manifold-constrained optimization problem. MCSD, for example, provides algorithms for such problems, including Stiefel constraints.[10]

<details>
<summary>From normalization to constrained optimization</summary>

Let $W$ be a weight matrix, and let $\mathcal L(W)$ be the training loss. A constraint limits the allowed weights to a set $\mathcal M$:

$$
\min_W\mathcal L(W)\quad\longrightarrow\quad\min_{W\in\mathcal M}\mathcal L(W).
$$

For a matrix $W\in\mathbb R^{m\times n}$ with $m\ge n$, the Stiefel constraint is

$$
W^\top W=I_n.
$$

Its columns are orthonormal, so all $n$ singular values are one. The matrix has full column rank and preserves input-vector lengths. A fixed Frobenius norm does not impose these same restrictions.[11]

Many manifold algorithms choose a direction in the tangent space. This space describes changes that preserve the constraint to first order. For the Stiefel manifold, a tangent direction $A$ satisfies

$$
W^\top A+A^\top W=0.
$$

A finite step can still leave the manifold. A retraction maps the candidate weights back to it. Section 0 introduces the update procedure used in our study.[11][12]

</details>

One question is how to design an optimizer for these constraints. Another question is how these constraints change training.[12] In this blog, we answer the following question to explain the advantages of weight normalization.

***How do manifold constraints affect the training dynamics of modern LLMs?***

We study activation scales and changes in weight direction, in addition to the final loss.[12] First, we define the constrained problem and introduce the optimizer that we use to study it.

## Shared Sources · Intro / Background

1. Kimi Team (2026). *Kimi K3: Open Frontier Intelligence*, v2. The report describes about 2.8 trillion total parameters and 104 billion activated parameters. [https://arxiv.org/html/2607.24653v2](https://arxiv.org/html/2607.24653v2)
2. Kaiyue Wen (@wen_kaiyue), 10 August 2026. Observation of weight RMS in Muse Glimmer, reproduced in the author's presentation, slide 7.
3. Ba, Kiros, and Hinton (2016). *Layer Normalization*. [https://arxiv.org/abs/1607.06450](https://arxiv.org/abs/1607.06450)
4. Zhang and Sennrich (2019). *Root Mean Square Layer Normalization*. [https://arxiv.org/abs/1910.07467](https://arxiv.org/abs/1910.07467)
5. Loshchilov, Hsieh, Sun, and Ginsburg (2025; first submitted 2024). *nGPT: Normalized Transformer with Representation Learning on the Hypersphere*, v2. [https://arxiv.org/abs/2410.01131v2](https://arxiv.org/abs/2410.01131v2)
6. Keller Jordan (2024). *Muon: An optimizer for hidden layers in neural networks*. [https://kellerjordan.github.io/posts/muon/](https://kellerjordan.github.io/posts/muon/)
7. Gu and Xie (2026). *Mano: Restriking Manifold Optimization for LLM Training*, Section 4.3 and Algorithm 1. [https://arxiv.org/html/2601.23000v1](https://arxiv.org/html/2601.23000v1)
8. Wen, Dang, Lyu, Ma, and Liang (2026). *Fantastic Pretraining Optimizers and Where to Find Them II: Hyperball Optimization*, v2. MuonH applies Hyperball to Muon. [https://arxiv.org/html/2606.16899v2](https://arxiv.org/html/2606.16899v2)
9. Xie et al. (2026). *Controlled LLM Training on Spectral Sphere*, v3. [https://arxiv.org/abs/2601.08393v3](https://arxiv.org/abs/2601.08393v3)
10. Yang and Lai (2026). *Manifold constrained steepest descent for smooth and closed-set optimization*, v2. Sections 3 and 6. [https://arxiv.org/html/2601.21487v2](https://arxiv.org/html/2601.21487v2)
11. Jeremy Bernstein (2025). *Modular Manifolds*. Thinking Machines Lab, 26 September 2025. See “The shape of a manifold optimizer” and “Manifold Muon.” [https://thinkingmachines.ai/blog/modular-manifolds/](https://thinkingmachines.ai/blog/modular-manifolds/)
12. An, Li, Goldfarb, and Ma (2026). *Demystifying Manifold Constraints in LLM Pre-training*, v2. Introduction and Sections 3–5. [https://arxiv.org/html/2605.04418v2](https://arxiv.org/html/2605.04418v2)
