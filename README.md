# ML Math Viz

See the math behind machine learning move. 25 interactive sandboxes where you drag the data points, slide the parameters, run the training loops, and watch the equations react in real time.

Built for students: every topic is a self-contained mini-lesson that goes from plain words to working code to live math.

## What's inside

**25 interactive topics** across five categories:

- **Supervised Learning**: Linear Regression, Polynomial Regression, Logistic Regression, Decision Tree, SVM, K-Nearest Neighbors, Naive Bayes
- **Unsupervised Learning**: K-Means, Hierarchical Clustering, DBSCAN, Gaussian Mixture Models, PCA
- **Advanced ML**: Ensembles, Random Forest, Gradient Boosting
- **Deep Learning**: Neural Networks, Weights & Biases, Activation Functions, Loss Functions, Optimizers, Bias-Variance, RNN, CNN, Transformers
- **Reinforcement Learning**: Q-learning in a grid world

**Each topic page is a guided lesson:**

1. *In plain words*: a one-sentence everyday analogy
2. *Why this model*: where it is used in the real world
3. *The data*: a small realistic dataset showing what the model consumes
4. *The code*: the core idea in a few runnable lines (sklearn / PyTorch / numpy)
5. *Try this*: guided experiments with a persistent checklist
6. *The sandbox*: the interactive visualization itself, with draggable points and live formulas

**3D scenes** (no WebGL library, a ~300-line canvas engine):

- **Optimizers**: a loss-surface bowl where plain SGD races momentum; the mesh rings are the loss contours
- **SVM**: the kernel trick, lifting ring data into 3D until a flat plane separates it
- **PCA**: a 3D point cloud flattening onto its top-two-component plane
- **Linear Regression**: fitting a plane to two-feature data with live residuals

Drag rotates, shift-drag pans, scroll or pinch zooms.

**Learning hub:**

- Home screen with a live hero demo: a real 2-4-4-1 network training on XOR with backpropagation, in the browser
- Difficulty levels, time estimates, and "builds on" prerequisite chains
- Progress tracking in localStorage (visited topics, completed experiments)
- Sidebar topic filter, arrow-key topic navigation, hash-based deep links

## Getting started

```bash
npm install
npm run dev        # development server
npm run build      # type-check + production build
npm run preview    # serve the production build
```

Requires Node 18+.

## Stack

- React 18 + TypeScript + Vite
- KaTeX for formulas
- Geist / Geist Mono via Fontsource
- No UI framework, no chart library, no 3D library: every visualization is hand-built SVG/canvas

Each visualization is its own lazy chunk, so the initial bundle stays small (~172 kB of JS before gzip; KaTeX and the lesson content load on demand).

## Project structure

```
src/
  App.tsx                 routing, rail navigation, progress, topic shell
  topics.tsx              topic catalog: metadata, levels, prereqs, experiments
  content.ts              beginner primers: intros, datasets, code snippets
  components/             shared UI (sliders, stats, skeletons, 3D canvas, home)
  visualizations/         one sandbox per topic, plus the four 3D scenes
  lib/                    math, plotting scales, the 3D engine (scene3d.ts)
```