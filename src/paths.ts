/** Curated learning tracks: an ordered route through the catalog. */

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  topics: string[];
}

export const PATHS: LearningPath[] = [
  {
    id: "foundations",
    name: "ML Foundations",
    description: "Zero to first trained models: fitting, overfitting, and classification basics.",
    topics: [
      "linear-regression",
      "polynomial-regression",
      "bias-variance",
      "knn",
      "logistic-regression",
      "decision-tree",
    ],
  },
  {
    id: "unsupervised",
    name: "Patterns Without Labels",
    description: "Find structure nobody labeled: clusters, densities, and directions.",
    topics: ["k-means", "hierarchical-clustering", "dbscan", "gaussian-mixture", "pca"],
  },
  {
    id: "trees",
    name: "Trees to Boosting",
    description: "From one decision tree to the strongest tabular models in practice.",
    topics: ["decision-tree", "ensembles", "random-forest", "gradient-boosting"],
  },
  {
    id: "deep",
    name: "Deep Learning",
    description: "From a single neuron to attention, one mechanism at a time.",
    topics: [
      "weights-and-biases",
      "activation-functions",
      "loss-functions",
      "optimizers",
      "neural-networks",
      "cnn",
      "rnn",
      "transformers",
    ],
  },
];
