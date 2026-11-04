Let \(W\) be a weight matrix, and let \(\mathcal L(W)\) be the training loss. A constraint limits the allowed weights to a set \(\mathcal M\):

\[
\min_W\mathcal L(W)
\quad\longrightarrow\quad
\min_{W\in\mathcal M}\mathcal L(W).
\]

For a matrix \(W\in\mathbb R^{m\times n}\) with \(m\ge n\), the Stiefel constraint is

\[
W^\top W=I_n.
\]

Its columns are orthonormal, so all \(n\) singular values are one. The matrix has full column rank and preserves input-vector lengths. A fixed Frobenius norm does not impose these same restrictions.[^modular]

Many manifold algorithms choose a direction in the tangent space. This space describes changes that preserve the constraint to first order. For the Stiefel manifold, a tangent direction \(A\) satisfies

\[
W^\top A+A^\top W=0.
\]

A finite step can still leave the manifold. A retraction maps the candidate weights back to it. Section 0 introduces the update procedure used in our study.[^modular][^macro]
