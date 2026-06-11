import { ComponentType, lazy } from "react";

/** Lazily load a named export so each visualization becomes its own chunk. */
function viz(load: () => Promise<Record<string, unknown>>, name: string): ComponentType {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const LinearRegression = viz(() => import("./visualizations/LinearRegression"), "LinearRegression");
const PolynomialRegression = viz(() => import("./visualizations/PolynomialRegression"), "PolynomialRegression");
const LogisticRegression = viz(() => import("./visualizations/LogisticRegression"), "LogisticRegression");
const KNN = viz(() => import("./visualizations/KNN"), "KNN");
const KMeans = viz(() => import("./visualizations/KMeans"), "KMeans");
const PCA = viz(() => import("./visualizations/PCA"), "PCA");
const DecisionTree = viz(() => import("./visualizations/DecisionTree"), "DecisionTree");
const SVM = viz(() => import("./visualizations/SVM"), "SVM");
const NaiveBayes = viz(() => import("./visualizations/NaiveBayes"), "NaiveBayes");
const HierarchicalClustering = viz(() => import("./visualizations/HierarchicalClustering"), "HierarchicalClustering");
const DBSCAN = viz(() => import("./visualizations/DBSCAN"), "DBSCAN");
const GaussianMixture = viz(() => import("./visualizations/GaussianMixture"), "GaussianMixture");
const Ensembles = viz(() => import("./visualizations/Ensembles"), "Ensembles");
const RandomForest = viz(() => import("./visualizations/RandomForest"), "RandomForest");
const GradientBoosting = viz(() => import("./visualizations/GradientBoosting"), "GradientBoosting");
const NeuralNetwork = viz(() => import("./visualizations/NeuralNetwork"), "NeuralNetwork");
const WeightsBiases = viz(() => import("./visualizations/WeightsBiases"), "WeightsBiases");
const ActivationFunctions = viz(() => import("./visualizations/ActivationFunctions"), "ActivationFunctions");
const LossFunctions = viz(() => import("./visualizations/LossFunctions"), "LossFunctions");
const Optimizers = viz(() => import("./visualizations/Optimizers"), "Optimizers");
const BiasVariance = viz(() => import("./visualizations/BiasVariance"), "BiasVariance");
const RNN = viz(() => import("./visualizations/RNN"), "RNN");
const CNN = viz(() => import("./visualizations/CNN"), "CNN");
const Transformers = viz(() => import("./visualizations/Transformers"), "Transformers");
const ReinforcementLearning = viz(() => import("./visualizations/ReinforcementLearning"), "ReinforcementLearning");

export type Level = "Beginner" | "Intermediate" | "Advanced";

export interface Equation {
  tex: string;
  caption: string;
}

export interface Topic {
  id: string;
  title: string;
  blurb: string;
  level: Level;
  /** Rough time to work through the sandbox and experiments. */
  minutes: number;
  /** Topic ids worth visiting first; rendered as a "Builds on" chip strip. */
  prereqs?: string[];
  /** Plain-language analogy shown before any math on tougher topics. */
  intuition?: string;
  /** Short guided experiments grounded in the sandbox's actual controls. */
  tryThis: string[];
  component?: ComponentType;
  /** For not-yet-interactive topics: a short math preview. */
  summary?: string;
  equations?: Equation[];
}

export interface Category {
  name: string;
  topics: Topic[];
}

export const CATEGORIES: Category[] = [
  {
    name: "Supervised Learning",
    topics: [
      {
        id: "linear-regression",
        title: "Linear Regression",
        blurb: "Fit a line by minimizing squared error — by hand, by gradient descent, or by formula.",
        level: "Beginner",
        minutes: 10,
        intuition:
          "Drawing the straightest honest line through a cloud of dots, so you can read off a guess for the next dot before it arrives.",
        tryThis: [
          "Drag the slope and intercept sliders until the MSE loss stops falling, then press Jump to best fit (OLS) to see how close you got.",
          "Run gradient descent with learning rate α at its maximum and watch the loss chart: does it still settle?",
          "Turn on Show squared errors and drag one point far away. Watch a single outlier bend the whole line.",
        ],
        component: LinearRegression,
      },
      {
        id: "polynomial-regression",
        title: "Polynomial Regression",
        blurb: "Give the line more bends and watch flexibility turn into overfitting.",
        level: "Beginner",
        minutes: 8,
        intuition:
          "Giving your ruler joints. A few joints follow the real curve; too many and the ruler bends to touch every dot, including the mistaken ones.",
        tryThis: [
          "Raise degree d until the curve threads every point, then add one new point and watch the fit break.",
          "Compare training MSE at degree 1 and at the maximum degree: lower error is not always a better model.",
        ],
        component: PolynomialRegression,
      },
      {
        id: "logistic-regression",
        title: "Logistic Regression",
        blurb: "Turn a linear score into a probability with the sigmoid, trained by cross-entropy.",
        level: "Intermediate",
        minutes: 12,
        intuition:
          "A judge who turns evidence into a confidence score between 0 and 1, instead of shouting guilty or innocent.",
        tryThis: [
          "Press Step once repeatedly and watch the boundary rotate as cross-entropy falls.",
          "Place one class-1 point deep inside class-0 territory. Can a straight boundary ever separate them?",
          "Set learning rate α to maximum, reset the weights, and retrain: does the loss still fall smoothly?",
        ],
        component: LogisticRegression,
      },
      {
        id: "decision-tree",
        title: "Decision Tree",
        blurb: "Split the space with the questions that reduce impurity the most.",
        level: "Beginner",
        minutes: 10,
        intuition:
          "Twenty questions, played against your data. Each question splits the possibilities; the leaves are the answers.",
        tryThis: [
          "Set max depth to 1 and study where the single split lands. Why that exact spot?",
          "Push max depth to the limit, then add one stray point and watch the tree carve a tiny box around it.",
          "Raise min samples per leaf and watch the boundary get calmer.",
        ],
        component: DecisionTree,
      },
      {
        id: "svm",
        title: "Support Vector Machine",
        blurb: "Not just any separating line — the one with the widest safety margin.",
        level: "Intermediate",
        minutes: 12,
        intuition:
          "Drawing the widest possible road between two crowds, then remembering only the few people standing at its edges.",
        tryThis: [
          "Train, then drag a circled support vector: the boundary follows. Drag a far-away point: nothing moves.",
          "Raise regularization λ and retrain. The margin widens even if some points end up inside it.",
        ],
        component: SVM,
      },
      {
        id: "knn",
        title: "K-Nearest Neighbors",
        blurb: "No training at all: measure distances, let the k closest points vote.",
        level: "Beginner",
        minutes: 8,
        intuition:
          "You are the average of your k closest friends. A new point asks its nearest neighbors what it should be.",
        tryThis: [
          "Set neighbors k to 1 and look near the class border: every stray point owns its own island.",
          "Raise k toward the maximum and watch the smaller class dissolve.",
          "Hover between the clusters and watch the k nearest points cast their votes.",
        ],
        component: KNN,
      },
      {
        id: "naive-bayes",
        title: "Naive Bayes",
        blurb: "Flip the question with Bayes' rule, then assume features don't talk to each other.",
        level: "Intermediate",
        minutes: 10,
        intuition:
          "A detective who weighs each clue separately, multiplies the suspicions together, and bets on the least surprising suspect.",
        tryThis: [
          "Drag one class's points tighter together and watch its bell curve sharpen.",
          "Make the two classes overlap heavily. Where does the boundary settle, and why there?",
        ],
        component: NaiveBayes,
      },
    ],
  },
  {
    name: "Unsupervised Learning",
    topics: [
      {
        id: "k-means",
        title: "K-Means Clustering",
        blurb: "Assign, average, repeat — watch the inertia fall until centroids stop moving.",
        level: "Beginner",
        minutes: 10,
        intuition:
          "Place k flags, let every point join its nearest flag, then move each flag to the middle of its crowd. Repeat until nothing moves.",
        tryThis: [
          "Initialize centroids, then step through assign and update moves while watching inertia: it never rises.",
          "Run to convergence several times on the same data. Do the centroids always land in the same place?",
          "Set clusters k higher than the blobs you can see, and watch k-means invent groups anyway.",
        ],
        component: KMeans,
      },
      {
        id: "hierarchical-clustering",
        title: "Hierarchical Clustering",
        blurb: "Merge the two closest clusters again and again, building a tree of groupings.",
        level: "Beginner",
        minutes: 10,
        intuition:
          "A family tree for data: keep marrying the two closest households until everyone is one family, then cut the tree where you want generations.",
        tryThis: [
          "Slide the cluster cut from many down to 2 and note which groups survive the longest.",
          "Add one far-away outlier and see how long it stays a cluster of its own.",
        ],
        component: HierarchicalClustering,
      },
      {
        id: "dbscan",
        title: "DBSCAN",
        blurb: "Clusters are dense regions — no k to choose, and outliers stay outliers.",
        level: "Intermediate",
        minutes: 12,
        intuition:
          "A cluster is anywhere the crowd is thick. Walk from neighbor to neighbor while it stays dense; whoever you never reach is noise.",
        tryThis: [
          "Shrink radius ε until the crescents shatter into noise, then grow it until they fuse into one blob.",
          "Raise minPts and watch thin bridges between clusters break apart.",
          "Hover points to see their ε-neighborhoods: find one core point and one noise point.",
        ],
        component: DBSCAN,
      },
      {
        id: "gaussian-mixture",
        title: "Gaussian Mixture Models",
        blurb: "Soft k-means: every point belongs to every cluster, with a probability.",
        level: "Advanced",
        minutes: 15,
        intuition:
          "K-means with humility: instead of declaring which cluster you belong to, it gives you a percentage in each.",
        tryThis: [
          "Step through the EM loop and watch the log-likelihood: it rises at every step, never falls.",
          "Set components k to 2 over three blobs and see which two get merged into one Gaussian.",
          "Watch the mixing weights π shift as one component claims more of the points.",
        ],
        component: GaussianMixture,
      },
      {
        id: "pca",
        title: "Principal Component Analysis",
        blurb: "Find the directions your data actually varies along — eigenvectors of the covariance.",
        level: "Intermediate",
        minutes: 10,
        intuition:
          "Photographing a 3D object from its most informative angle, so the flat picture loses as little as possible.",
        tryThis: [
          "Drag points into a tilted ellipse and watch PC1 lock onto the long axis.",
          "Make the cloud roughly circular: PC1 variance share falls toward 50% and the direction becomes arbitrary.",
        ],
        component: PCA,
      },
    ],
  },
  {
    name: "Advanced ML",
    topics: [
      {
        id: "ensembles",
        title: "Ensembles",
        blurb: "Many mediocre models, averaged, beat one careful model — if their errors disagree.",
        level: "Intermediate",
        minutes: 12,
        prereqs: ["polynomial-regression", "decision-tree"],
        intuition:
          "Ask fifty mediocre forecasters and average their answers: their individual mistakes point in different directions, so the average beats most of them. That cancellation is the whole idea.",
        tryThis: [
          "Increase models m and watch the ensemble error fall below the average single-model error.",
          "Press Resample bootstraps a few times: individual fits jump around, the average barely moves.",
        ],
        component: Ensembles,
      },
      {
        id: "random-forest",
        title: "Random Forest",
        blurb: "Bagged decision trees, plus a twist: each split sees only a random subset of features.",
        level: "Intermediate",
        minutes: 12,
        prereqs: ["decision-tree", "ensembles"],
        intuition:
          "A crowd of decision trees, each shown a reshuffled copy of the data and allowed to peek at only some of the features. Diverse trees make diverse mistakes, and the vote cancels them out.",
        tryThis: [
          "Grow trees in the vote from 1 to many and watch the jagged boundary smooth out.",
          "Press Regrow forest: every single tree changes, but the vote barely does.",
        ],
        component: RandomForest,
      },
      {
        id: "gradient-boosting",
        title: "Gradient Boosting",
        blurb: "Each new tree is trained on what the previous ensemble still gets wrong.",
        level: "Advanced",
        minutes: 15,
        prereqs: ["decision-tree", "ensembles"],
        intuition:
          "A relay team where each new runner's only job is to make up the distance the team is still behind. Every tree is a small correction to what came before.",
        tryThis: [
          "Raise the tree count one step at a time and watch each new tree chase the leftover error.",
          "Compare a low learning rate η with many trees against a high η with few: small steps usually win.",
        ],
        component: GradientBoosting,
      },
    ],
  },
  {
    name: "Deep Learning",
    topics: [
      {
        id: "neural-networks",
        title: "Neural Networks",
        blurb: "Stacked linear models with nonlinear squashes in between — trained by backpropagation.",
        level: "Intermediate",
        minutes: 15,
        prereqs: ["linear-regression", "logistic-regression"],
        intuition:
          "Layers that each redraw the data a little, bending and stretching the space until the two classes end up easy to cut apart with a straight line.",
        tryThis: [
          "Train with the fewest hidden neurons, then add more: watch the boundary go from stiff to fluid.",
          "Watch the parameters count as you add layers and neurons. How few does this dataset really need?",
          "Reset weights and retrain: different start, different valley, similar accuracy.",
        ],
        component: NeuralNetwork,
      },
      {
        id: "weights-and-biases",
        title: "Weights & Biases",
        blurb: "The only things a network can change — slopes and shifts, millions of them.",
        level: "Beginner",
        minutes: 8,
        prereqs: ["linear-regression"],
        intuition:
          "The network's knobs. A weight decides how much one input matters; a bias shifts the tipping point. Training is nothing more than turning millions of these knobs.",
        tryThis: [
          "Drag weight w₁ and watch the decision line tilt; drag bias b and watch it slide.",
          "Move the probe point across the line and watch its score flip sign exactly at the boundary.",
        ],
        component: WeightsBiases,
      },
      {
        id: "activation-functions",
        title: "Activation Functions",
        blurb: "Without them, a 100-layer network collapses into one linear model.",
        level: "Beginner",
        minutes: 10,
        prereqs: ["weights-and-biases"],
        intuition:
          "The bend between layers. Without a bend, stacking layers is like stacking panes of clear glass: many layers, exactly the same view.",
        tryThis: [
          "Slide probe z across each curve and compare gradient φ′(z): where does sigmoid go flat?",
          "Watch the fit error fall as more kinks become available to bend the function.",
        ],
        component: ActivationFunctions,
      },
      {
        id: "loss-functions",
        title: "Loss Functions",
        blurb: "The single number the whole network exists to push down.",
        level: "Intermediate",
        minutes: 12,
        prereqs: ["linear-regression", "logistic-regression"],
        intuition:
          "The score the model is graded on. Training never sees right or wrong, only this number going down, so choosing the score is choosing the behavior.",
        tryThis: [
          "Slide probe error e far out and compare the MSE and MAE gradients: which one explodes on outliers?",
          "Tune Huber δ until it behaves like MSE near zero and like MAE far away.",
          "Drag predicted p̂ toward the wrong extreme and watch cross-entropy blow up.",
        ],
        component: LossFunctions,
      },
      {
        id: "optimizers",
        title: "Optimizers",
        blurb: "Smarter ways to roll downhill: momentum remembers, Adam adapts.",
        level: "Advanced",
        minutes: 15,
        prereqs: ["linear-regression", "loss-functions"],
        intuition:
          "Ways to walk downhill in thick fog. Plain descent feels the slope underfoot. Momentum remembers which way it has been moving. Adam also adapts its stride in every direction.",
        tryThis: [
          "Raise the condition number to stretch the valley, then watch plain gradient descent zigzag.",
          "Turn momentum β up on the same valley and watch the zigzag smooth into a curve.",
        ],
        component: Optimizers,
      },
      {
        id: "bias-variance",
        title: "Bias–Variance Trade-off",
        blurb: "Expected error splits into three parts — and you can only trade two of them.",
        level: "Intermediate",
        minutes: 12,
        prereqs: ["polynomial-regression"],
        intuition:
          "A too-simple model misses the pattern the same way on every dataset; a too-flexible one memorizes each dataset's noise differently every time. The sweet spot is a trade between the two.",
        tryThis: [
          "Sweep model degree and find the bottom of the expected-error U-curve.",
          "Raise noise σ² and watch the best degree shift toward simpler models.",
          "Press Resample all 30 worlds: high-degree fits scatter wildly. That spread is variance.",
        ],
        component: BiasVariance,
      },
      {
        id: "rnn",
        title: "Recurrent Neural Networks",
        blurb: "A network with memory: the same weights applied at every time step.",
        level: "Advanced",
        minutes: 15,
        prereqs: ["neural-networks"],
        intuition:
          "Reading a sentence one word at a time while keeping a sticky note of everything so far. The sticky note is the hidden state, and it gets rewritten at every step.",
        tryThis: [
          "Set recurrent weight w just below 1, then just above: watch the pulse vanish or explode.",
          "Lengthen sequence length T and see how far a pulse at an early step can still be felt.",
        ],
        component: RNN,
      },
      {
        id: "cnn",
        title: "Convolutional Neural Networks",
        blurb: "Slide one small filter everywhere — weight sharing turned into a superpower.",
        level: "Advanced",
        minutes: 15,
        prereqs: ["neural-networks"],
        intuition:
          "One small magnifying glass slid across the whole image, hunting the same pattern everywhere. You learn one detector and reuse it, instead of learning one per pixel.",
        tryThis: [
          "Follow the filter as it slides across the input and count how many times the same few weights get reused.",
          "Compare parameters in this layer against what a dense layer would need for the same input.",
        ],
        component: CNN,
      },
      {
        id: "transformers",
        title: "Transformers",
        blurb: "Every token looks at every other token and decides what matters — attention.",
        level: "Advanced",
        minutes: 15,
        prereqs: ["neural-networks", "cnn"],
        intuition:
          "Every word glances at every other word and decides which ones matter for its own meaning. Those weighted glances are attention, and they happen all at once.",
        tryThis: [
          "Drag two word vectors to point the same way and watch their attention weights climb.",
          "Lower the √dₖ temperature scale and watch attention sharpen onto a single word.",
          "Pick a different query row in the attention matrix and see whose values it mixes.",
        ],
        component: Transformers,
      },
    ],
  },
  {
    name: "Reinforcement Learning",
    topics: [
      {
        id: "reinforcement-learning",
        title: "Reinforcement Learning",
        blurb: "No labels, just rewards — learn the value of actions by acting.",
        level: "Advanced",
        minutes: 15,
        prereqs: ["loss-functions"],
        intuition:
          "Training a puppy: no instruction manual, just treats. The agent tries actions, remembers which ones eventually led to treats, and gradually prefers them.",
        tryThis: [
          "Train with exploration ε high, then drop it to near zero: going greedy too early gets the agent stuck.",
          "Lower discount γ and watch the agent stop caring about far-away reward.",
          "Reset the Q-table and watch the return-per-episode curve climb all over again.",
        ],
        component: ReinforcementLearning,
      },
    ],
  },
];

export const ALL_TOPICS: Topic[] = CATEGORIES.flatMap((c) => c.topics);

export function findTopic(id: string): Topic | undefined {
  return ALL_TOPICS.find((t) => t.id === id);
}
