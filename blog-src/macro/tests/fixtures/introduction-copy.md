<!-- READER COPY. Introduction opening v3; remaining prose unchanged. -->

In 2026, the open-weight model Kimi K3 has about **2.8 trillion total parameters**.[^kimi] Pretraining is still scaling. But data and compute are not unlimited. The training recipe deserves as much attention as model size. Can we get more from pretraining by changing how weights learn, rather than only adding data or compute?

One clue comes from the weights themselves. Kaiyue Wen reported an unusual pattern in Muse Glimmer: the matrices he examined had nearly the same root-mean-square (RMS) value, about **0.006**, across layers and matrix types. RMS measures the typical size of their entries.[^wen]

The comparison below shows the weight-RMS patterns in Qwen3-8B and Muse Glimmer.

Why might keeping weight scale fixed help a model learn? That's the puzzle we want to explore.

Normalization itself is not new. What matters here is *what* we normalize. LayerNorm and RMSNorm act on activations—the signals passed through a model. Other methods act on the updates or the weights themselves.[^layernorm][^rmsnorm]

<!-- VISUAL I-B. Render the next label and three rows as one compact comparison graphic. -->
<!-- This is a classification, not a timeline. The following wording replaces the draft's table. -->

**What are we normalizing?**

| Object | Examples |
| --- | --- |
| **Activations** — signals inside the model | LayerNorm and RMSNorm normalize activations. nGPT also normalizes hidden states.[^layernorm][^rmsnorm][^ngpt] |
| **Updates** — proposed changes to weights | Muon approximately orthogonalizes momentum matrices. Mano uses row- and column-wise geometry to project and normalize momentum.[^muon][^mano] |
| **Weights** — parameters learned during training | nGPT normalizes parameter vectors. MuonH fixes matrix Frobenius norms, while SSO fixes spectral norms.[^ngpt][^hyperball][^sso] |

Some methods act on more than one object. Hyperball and SSO, for example, also control update norms.[^hyperball][^sso]

But adding a weight constraint is more than a rescaling trick. The entries can still change, but not in every possible way. Take the Stiefel constraint discussed in Thinking Machines Lab's *Modular Manifolds*. It keeps a matrix's columns orthonormal: perpendicular to each other and unit length. Such a matrix cannot become rank-deficient and collapse an input direction to zero. This restricts the transformations the layer can learn, not just the size of its weights.[^modular]

Different constraints leave different kinds of freedom. When the allowed weights form a smooth manifold, training becomes a manifold-constrained optimization problem. MCSD, for example, provides algorithms for such problems, including Stiefel constraints.[^mcsd]

<!-- OPTIONAL I-C. Insert the closed mathematical note specified in the blueprint here. -->

One question is how to design an optimizer for these constraints. Another question is how these constraints change training.[^macro] In this blog, we answer the following question to explain the advantages of weight normalization.

***How do manifold constraints affect the training dynamics of modern LLMs?***

We study activation scales and changes in weight direction, in addition to the final loss.[^macro] First, we define the constrained problem and introduce the optimizer that we use to study it.

<!-- The existing Contents navigation follows. Sections 0–4 are unchanged in this revision. -->

<!-- PUBLIC REFERENCES. Integrate these entries into the shared Sources section. -->
<!-- Verification limits and implementation notes belong in the blueprint, not these reader references. -->

[^kimi]: Kimi Team (2026). *Kimi K3: Open Frontier Intelligence*, v2. The report describes about 2.8 trillion total parameters and 104 billion activated parameters. https://arxiv.org/html/2607.24653v2
[^wen]: Kaiyue Wen (@wen_kaiyue), 10 August 2026. Observation of weight RMS in Muse Glimmer, reproduced in the author's presentation, slide 7.
[^layernorm]: Ba, Kiros, and Hinton (2016). *Layer Normalization*. https://arxiv.org/abs/1607.06450
[^rmsnorm]: Zhang and Sennrich (2019). *Root Mean Square Layer Normalization*. https://arxiv.org/abs/1910.07467
[^ngpt]: Loshchilov, Hsieh, Sun, and Ginsburg (2025; first submitted 2024). *nGPT: Normalized Transformer with Representation Learning on the Hypersphere*, v2. https://arxiv.org/abs/2410.01131v2
[^muon]: Keller Jordan (2024). *Muon: An optimizer for hidden layers in neural networks*. https://kellerjordan.github.io/posts/muon/
[^mano]: Gu and Xie (2026). *Mano: Restriking Manifold Optimization for LLM Training*, Section 4.3 and Algorithm 1. https://arxiv.org/html/2601.23000v1
[^hyperball]: Wen, Dang, Lyu, Ma, and Liang (2026). *Fantastic Pretraining Optimizers and Where to Find Them II: Hyperball Optimization*, v2. MuonH applies Hyperball to Muon. https://arxiv.org/html/2606.16899v2
[^sso]: Xie et al. (2026). *Controlled LLM Training on Spectral Sphere*, v3. https://arxiv.org/abs/2601.08393v3
[^mcsd]: Yang and Lai (2026). *Manifold constrained steepest descent for smooth and closed-set optimization*, v2. Sections 3 and 6. https://arxiv.org/html/2601.21487v2
[^modular]: Jeremy Bernstein (2025). *Modular Manifolds*. Thinking Machines Lab, 26 September 2025. See “The shape of a manifold optimizer” and “Manifold Muon.” https://thinkingmachines.ai/blog/modular-manifolds/
[^macro]: An, Li, Goldfarb, and Ma (2026). *Demystifying Manifold Constraints in LLM Pre-training*, v2. Introduction and Sections 3–5. https://arxiv.org/html/2605.04418v2
