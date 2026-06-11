/**
 * Beginner primers: for each topic, a short "why this model" intro, a small
 * realistic dataset showing what the model consumes, and a core code snippet.
 * Rendered by TopicPrimer above the interactive sandbox.
 */

export interface TopicDataset {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface TopicExtra {
  intro: string;
  dataset: TopicDataset;
  code: string;
  codeCaption?: string;
}

export const TOPIC_EXTRAS: Record<string, TopicExtra> = {
  "linear-regression": {
    intro:
      "Linear regression predicts a number from other numbers by drawing the best straight line through past examples. It powers price estimates, demand forecasts, and trend lines, and it is usually the first model you try because it is fast, stable, and easy to explain.",
    dataset: {
      caption: "Apartment size vs sale price. The model learns price ≈ m·size + c.",
      columns: ["size (m²)", "price (k$)"],
      rows: [
        [34, 118], [41, 137], [52, 161], [58, 174], [63, 192],
        [71, 205], [76, 226], [84, 241], [92, 262], [101, 287],
        [110, 301], [124, 332],
      ],
    },
    code: `from sklearn.linear_model import LinearRegression

X = [[34], [41], [52], [58], [63], [71]]   # size in m²
y = [118, 137, 161, 174, 192, 205]         # price in k$

model = LinearRegression().fit(X, y)
print(model.coef_, model.intercept_)       # slope m, intercept c
print(model.predict([[80]]))               # price for an 80 m² flat`,
  },

  "polynomial-regression": {
    intro:
      "When the relationship curves, a straight line underfits. Polynomial regression adds powers of the input (x², x³, ...) so the same linear machinery can bend, which fits things like braking distance vs speed or crop yield vs fertilizer. The catch you will see in the sandbox: too much bend memorizes noise.",
    dataset: {
      caption: "Car speed vs braking distance. Distance grows roughly with speed squared.",
      columns: ["speed (km/h)", "braking distance (m)"],
      rows: [
        [20, 4], [30, 8], [40, 14], [50, 22], [60, 31],
        [70, 43], [80, 56], [90, 71], [100, 88], [110, 107],
      ],
    },
    code: `from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline

X = [[20], [30], [40], [50], [60], [70]]
y = [4, 8, 14, 22, 31, 43]

model = make_pipeline(PolynomialFeatures(degree=2), LinearRegression())
model.fit(X, y)
print(model.predict([[95]]))   # braking distance at 95 km/h`,
  },

  "logistic-regression": {
    intro:
      "Logistic regression answers yes-or-no questions with a probability: will this student pass, is this transaction fraud, will this customer churn. It is the workhorse of classification because the output is a calibrated probability you can act on, not just a hard label.",
    dataset: {
      caption: "Study hours and attendance vs exam result. The model outputs P(pass).",
      columns: ["hours studied", "attendance (%)", "passed"],
      rows: [
        [2, 60, 0], [3, 70, 0], [4, 55, 0], [5, 80, 0], [6, 75, 1],
        [7, 85, 1], [8, 65, 1], [9, 90, 1], [10, 95, 1], [4, 90, 0],
        [6, 50, 0], [11, 80, 1],
      ],
    },
    code: `from sklearn.linear_model import LogisticRegression

X = [[2, 60], [5, 80], [6, 75], [9, 90], [4, 90], [11, 80]]
y = [0, 0, 1, 1, 0, 1]                       # 1 = passed

model = LogisticRegression().fit(X, y)
print(model.predict_proba([[7, 85]]))        # [P(fail), P(pass)]`,
  },

  "decision-tree": {
    intro:
      "A decision tree asks a sequence of simple questions (\"humidity above 75%?\") until it reaches an answer, exactly like a flowchart. Trees handle mixed feature types, need no scaling, and you can read the learned rules directly, which is why they are everywhere in credit scoring and medical triage.",
    dataset: {
      caption: "The classic play-tennis data: weather conditions vs whether a match happened.",
      columns: ["outlook", "temp (°C)", "humidity (%)", "windy", "played"],
      rows: [
        ["sunny", 29, 85, "no", "no"], ["sunny", 27, 90, "yes", "no"],
        ["overcast", 28, 78, "no", "yes"], ["rain", 21, 96, "no", "yes"],
        ["rain", 20, 80, "no", "yes"], ["rain", 18, 70, "yes", "no"],
        ["overcast", 18, 65, "yes", "yes"], ["sunny", 22, 95, "no", "no"],
        ["sunny", 21, 70, "no", "yes"], ["rain", 24, 80, "no", "yes"],
        ["sunny", 24, 70, "yes", "yes"], ["overcast", 22, 90, "yes", "yes"],
      ],
    },
    code: `from sklearn.tree import DecisionTreeClassifier, export_text

X = [[29, 85, 0], [27, 90, 1], [28, 78, 0], [21, 96, 0],
     [18, 70, 1], [21, 70, 0]]              # temp, humidity, windy
y = ["no", "no", "yes", "yes", "no", "yes"]

tree = DecisionTreeClassifier(max_depth=2).fit(X, y)
print(export_text(tree))                     # the learned questions`,
  },

  svm: {
    intro:
      "A support vector machine looks for the boundary with the widest safety margin between classes, which makes it robust when you have few examples and many features. It shines in text classification and bioinformatics, and with kernels it separates data no straight line could.",
    dataset: {
      caption: "Tumor measurements vs diagnosis. SVMs are classic on this kind of data.",
      columns: ["radius (mm)", "texture score", "diagnosis"],
      rows: [
        [8.2, 12.1, "benign"], [9.0, 14.3, "benign"], [9.8, 11.7, "benign"],
        [10.5, 15.0, "benign"], [11.2, 13.4, "benign"], [14.8, 22.5, "malignant"],
        [16.1, 25.7, "malignant"], [17.3, 21.9, "malignant"], [18.0, 27.2, "malignant"],
        [19.4, 24.8, "malignant"], [12.9, 19.5, "malignant"], [10.1, 17.8, "benign"],
      ],
    },
    code: `from sklearn.svm import SVC

X = [[8.2, 12.1], [9.8, 11.7], [11.2, 13.4],
     [14.8, 22.5], [17.3, 21.9], [19.4, 24.8]]
y = [0, 0, 0, 1, 1, 1]                       # 1 = malignant

model = SVC(kernel="rbf", C=1.0).fit(X, y)
print(model.support_vectors_)                # the points holding the line`,
  },

  knn: {
    intro:
      "K-nearest neighbors skips training entirely: to classify something new, find the k most similar past examples and let them vote. It is the simplest serious classifier, used for recommendations (\"users like you\"), anomaly checks, and as a baseline every fancier model must beat.",
    dataset: {
      caption: "Fruit by weight and diameter. A new fruit is labeled by its nearest neighbors.",
      columns: ["weight (g)", "diameter (cm)", "fruit"],
      rows: [
        [150, 7.0, "apple"], [170, 7.6, "apple"], [140, 6.7, "apple"],
        [160, 7.3, "apple"], [86, 4.2, "mandarin"], [80, 4.0, "mandarin"],
        [92, 4.5, "mandarin"], [210, 8.1, "orange"], [230, 8.5, "orange"],
        [195, 7.9, "orange"], [205, 8.0, "orange"], [155, 7.1, "apple"],
      ],
    },
    code: `from sklearn.neighbors import KNeighborsClassifier

X = [[150, 7.0], [86, 4.2], [210, 8.1],
     [170, 7.6], [80, 4.0], [230, 8.5]]
y = ["apple", "mandarin", "orange", "apple", "mandarin", "orange"]

knn = KNeighborsClassifier(n_neighbors=3).fit(X, y)
print(knn.predict([[165, 7.4]]))             # the 3 closest vote`,
  },

  "naive-bayes": {
    intro:
      "Naive Bayes classifies by asking \"which class makes this evidence least surprising?\" using Bayes' rule, while pretending features are independent. That naive assumption makes it absurdly fast, which is why it filtered your spam for two decades and still wins on small text datasets.",
    dataset: {
      caption: "Word counts per email vs label. Each word contributes evidence independently.",
      columns: ["count: \"free\"", "count: \"meeting\"", "count: \"winner\"", "label"],
      rows: [
        [3, 0, 2, "spam"], [2, 0, 1, "spam"], [4, 1, 3, "spam"],
        [0, 2, 0, "ham"], [1, 3, 0, "ham"], [0, 4, 0, "ham"],
        [2, 1, 1, "spam"], [0, 1, 0, "ham"], [5, 0, 2, "spam"],
        [0, 3, 0, "ham"], [1, 0, 0, "ham"], [3, 0, 1, "spam"],
      ],
    },
    code: `from sklearn.naive_bayes import MultinomialNB

X = [[3, 0, 2], [0, 2, 0], [4, 1, 3],
     [1, 3, 0], [2, 1, 1], [0, 4, 0]]        # word counts
y = ["spam", "ham", "spam", "ham", "spam", "ham"]

nb = MultinomialNB().fit(X, y)
print(nb.predict_proba([[1, 1, 0]]))         # P(spam), P(ham)`,
  },

  "k-means": {
    intro:
      "K-means finds groups in data nobody labeled: customer segments, image color palettes, sensor regimes. You pick how many clusters k to look for; the algorithm alternates between assigning points to the nearest center and moving each center to the middle of its points.",
    dataset: {
      caption: "Customer behavior with no labels. K-means discovers the segments itself.",
      columns: ["annual spend ($)", "visits / month"],
      rows: [
        [210, 2], [340, 3], [280, 2], [1900, 12], [2300, 15],
        [2100, 13], [980, 7], [1100, 8], [870, 6], [250, 1],
        [2050, 14], [1020, 7],
      ],
    },
    code: `from sklearn.cluster import KMeans

X = [[210, 2], [340, 3], [1900, 12], [2300, 15],
     [980, 7], [1100, 8], [250, 1], [2050, 14]]

km = KMeans(n_clusters=3, n_init="auto").fit(X)
print(km.labels_)            # which segment each customer landed in
print(km.cluster_centers_)   # the segment "prototypes"`,
  },

  "hierarchical-clustering": {
    intro:
      "Hierarchical clustering does not ask for k upfront: it keeps merging the two closest groups until everything is one tree, and you cut the tree at whatever level of detail you need. Biologists use it to group species and genes; analysts use it when the right number of clusters is itself the question.",
    dataset: {
      caption: "Animals by two traits. The merge tree (dendrogram) reveals nested family groups.",
      columns: ["animal", "body mass (kg)", "lifespan (yr)"],
      rows: [
        ["mouse", 0.02, 2], ["rat", 0.3, 3], ["rabbit", 2, 9],
        ["cat", 4, 15], ["dog", 20, 13], ["wolf", 38, 14],
        ["deer", 90, 18], ["horse", 450, 28], ["cow", 600, 20],
        ["elephant", 4800, 65],
      ],
    },
    code: `from scipy.cluster.hierarchy import linkage, fcluster

X = [[0.02, 2], [0.3, 3], [2, 9], [4, 15],
     [20, 13], [38, 14], [450, 28], [600, 20]]

tree = linkage(X, method="ward")     # the full merge history
labels = fcluster(tree, t=3, criterion="maxclust")
print(labels)                        # cut the tree into 3 groups`,
  },

  dbscan: {
    intro:
      "DBSCAN defines a cluster as a dense region, so it finds banana shapes and rings that k-means mangles, and it labels sparse stragglers as noise instead of forcing them into a group. That makes it the go-to for GPS data, anomaly detection, and any map-like data with outliers.",
    dataset: {
      caption: "Taxi pickup coordinates. Dense streets become clusters; lone pickups become noise.",
      columns: ["x (km east)", "y (km north)"],
      rows: [
        [1.2, 3.4], [1.3, 3.5], [1.1, 3.6], [1.25, 3.45], [5.8, 1.2],
        [5.9, 1.1], [6.0, 1.3], [5.85, 1.25], [9.7, 8.8], [3.4, 7.1],
        [1.15, 3.55], [5.95, 1.15],
      ],
    },
    code: `from sklearn.cluster import DBSCAN

X = [[1.2, 3.4], [1.3, 3.5], [1.1, 3.6],
     [5.8, 1.2], [5.9, 1.1], [6.0, 1.3],
     [9.7, 8.8]]                              # one lone pickup

db = DBSCAN(eps=0.5, min_samples=3).fit(X)
print(db.labels_)        # cluster ids; -1 means "noise, not yours"`,
  },

  "gaussian-mixture": {
    intro:
      "A Gaussian mixture model assumes the data was generated by a few overlapping bell curves and recovers them, giving every point a probability of belonging to each cluster instead of a hard assignment. That soft membership matters when groups genuinely overlap: speaker voices, cell populations, financial regimes.",
    dataset: {
      caption: "Flower petal measurements from two overlapping species, unlabeled.",
      columns: ["petal length (cm)", "petal width (cm)"],
      rows: [
        [1.4, 0.2], [1.5, 0.3], [1.3, 0.2], [1.6, 0.4], [1.4, 0.3],
        [4.5, 1.5], [4.9, 1.6], [4.2, 1.3], [5.1, 1.8], [4.7, 1.4],
        [3.3, 1.0], [3.6, 1.2],
      ],
    },
    code: `from sklearn.mixture import GaussianMixture

X = [[1.4, 0.2], [1.5, 0.3], [1.6, 0.4],
     [4.5, 1.5], [4.9, 1.6], [5.1, 1.8],
     [3.3, 1.0]]                              # ambiguous one

gmm = GaussianMixture(n_components=2).fit(X)
print(gmm.predict_proba(X).round(2))          # soft memberships`,
  },

  pca: {
    intro:
      "PCA compresses many correlated columns into a few new axes that keep most of the variation, so you can visualize, denoise, or speed up anything downstream. Five exam subjects often compress to two axes (\"overall ability\" and \"sciences vs humanities\") with little loss.",
    dataset: {
      caption: "Student scores in five subjects. PCA finds the few directions that explain most of it.",
      columns: ["math", "physics", "chem", "history", "lit"],
      rows: [
        [88, 85, 82, 60, 58], [92, 90, 88, 55, 52], [75, 72, 70, 68, 66],
        [60, 58, 62, 88, 90], [55, 52, 50, 92, 95], [70, 68, 65, 75, 78],
        [95, 92, 90, 50, 48], [62, 60, 58, 85, 88], [80, 78, 75, 70, 68],
        [58, 55, 52, 90, 92],
      ],
    },
    code: `from sklearn.decomposition import PCA

X = [[88, 85, 82, 60, 58], [92, 90, 88, 55, 52],
     [60, 58, 62, 88, 90], [55, 52, 50, 92, 95],
     [80, 78, 75, 70, 68]]

pca = PCA(n_components=2).fit(X)
print(pca.explained_variance_ratio_)   # how much each axis keeps
print(pca.transform(X))                # 5 columns -> 2`,
  },

  ensembles: {
    intro:
      "An ensemble averages several imperfect models so their independent mistakes cancel. It is the most reliable accuracy trick in practice: almost every Kaggle winner and production ranking system is an ensemble of some kind. The only requirement is that the models disagree in how they are wrong.",
    dataset: {
      caption: "Three models' house-price predictions vs the truth. The average beats each one.",
      columns: ["true price", "model A", "model B", "model C", "average"],
      rows: [
        [250, 261, 244, 247, 250.7], [310, 298, 322, 305, 308.3],
        [195, 204, 188, 199, 197.0], [420, 405, 433, 418, 418.7],
        [275, 286, 263, 280, 276.3], [340, 329, 352, 336, 339.0],
        [225, 233, 214, 226, 224.3], [380, 391, 368, 377, 378.7],
      ],
    },
    code: `from sklearn.ensemble import VotingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.neighbors import KNeighborsRegressor

ensemble = VotingRegressor([
    ("linear", LinearRegression()),
    ("tree", DecisionTreeRegressor(max_depth=4)),
    ("knn", KNeighborsRegressor(n_neighbors=5)),
])
ensemble.fit(X_train, y_train)        # errors disagree, average wins`,
  },

  "random-forest": {
    intro:
      "A random forest grows hundreds of decision trees, each on a reshuffled copy of the data with a random subset of features per split, then lets them vote. It is the default \"just works\" model for tabular data: strong accuracy, little tuning, and built-in feature importance.",
    dataset: {
      caption: "Loan applications vs repayment outcome, the bread-and-butter of forests.",
      columns: ["income (k$)", "debt (k$)", "age", "defaulted"],
      rows: [
        [45, 12, 29, "no"], [38, 25, 35, "yes"], [85, 10, 41, "no"],
        [29, 18, 23, "yes"], [62, 8, 38, "no"], [33, 30, 27, "yes"],
        [71, 15, 45, "no"], [27, 22, 31, "yes"], [54, 9, 36, "no"],
        [40, 28, 26, "yes"], [90, 20, 50, "no"], [31, 16, 24, "yes"],
      ],
    },
    code: `from sklearn.ensemble import RandomForestClassifier

X = [[45, 12, 29], [38, 25, 35], [85, 10, 41],
     [29, 18, 23], [62, 8, 38], [33, 30, 27]]
y = [0, 1, 0, 1, 0, 1]                        # 1 = defaulted

rf = RandomForestClassifier(n_estimators=300).fit(X, y)
print(rf.predict_proba([[50, 20, 30]]))       # the forest votes
print(rf.feature_importances_)`,
  },

  "gradient-boosting": {
    intro:
      "Gradient boosting builds trees one at a time, each trained on the errors the ensemble still makes, shrunk by a learning rate. Tuned well, it is the strongest model family for tabular data; XGBoost and LightGBM are industrial versions of exactly what this sandbox shows.",
    dataset: {
      caption: "Used-car features vs price. Boosting chases whatever error remains, round by round.",
      columns: ["age (yr)", "mileage (k km)", "engine (L)", "price (k$)"],
      rows: [
        [1, 15, 1.6, 21.5], [3, 45, 1.6, 16.8], [5, 80, 2.0, 13.2],
        [2, 28, 1.4, 18.9], [8, 120, 1.6, 8.1], [4, 60, 2.0, 14.7],
        [10, 160, 1.8, 5.9], [6, 95, 1.4, 10.8], [2, 22, 2.0, 20.3],
        [7, 110, 1.6, 9.4], [9, 140, 2.0, 7.2], [3, 38, 1.8, 17.5],
      ],
    },
    code: `from sklearn.ensemble import GradientBoostingRegressor

X = [[1, 15, 1.6], [3, 45, 1.6], [5, 80, 2.0],
     [8, 120, 1.6], [10, 160, 1.8], [2, 22, 2.0]]
y = [21.5, 16.8, 13.2, 8.1, 5.9, 20.3]

gb = GradientBoostingRegressor(
    n_estimators=200, learning_rate=0.1, max_depth=3)
gb.fit(X, y)                  # each tree fixes the last one's errors`,
  },

  "neural-networks": {
    intro:
      "A neural network stacks layers of weighted sums and nonlinear squashes until it can model almost any relationship, given enough data. The same recipe behind image recognition and language models applies here at miniature scale: a few neurons learning a boundary no straight line could draw.",
    dataset: {
      caption: "Microchip test scores vs quality check. The pass region is not linearly separable.",
      columns: ["test 1 score", "test 2 score", "passed QA"],
      rows: [
        [0.2, 0.3, 0], [0.8, 0.9, 0], [0.5, 0.5, 1], [0.4, 0.6, 1],
        [0.1, 0.9, 0], [0.9, 0.1, 0], [0.6, 0.4, 1], [0.3, 0.5, 1],
        [0.95, 0.85, 0], [0.15, 0.2, 0], [0.55, 0.65, 1], [0.45, 0.35, 1],
      ],
    },
    code: `from sklearn.neural_network import MLPClassifier

X = [[0.2, 0.3], [0.8, 0.9], [0.5, 0.5],
     [0.1, 0.9], [0.6, 0.4], [0.9, 0.1]]
y = [0, 0, 1, 0, 1, 0]

mlp = MLPClassifier(hidden_layer_sizes=(8, 8), max_iter=2000)
mlp.fit(X, y)                 # backprop turns the knobs
print(mlp.predict([[0.5, 0.6]]))`,
  },

  "weights-and-biases": {
    intro:
      "Strip a neuron to its skeleton and it is just score = w₁x₁ + w₂x₂ + b: weights decide how much each input matters, the bias shifts the tipping point. Everything a billion-parameter model knows is stored in numbers exactly like these four.",
    dataset: {
      caption: "One neuron scoring two inputs with w₁ = 1.5, w₂ = -2.0, b = 0.5.",
      columns: ["x₁", "x₂", "score", "fires?"],
      rows: [
        [1.0, 0.2, 1.6, "yes"], [0.5, 1.0, -0.75, "no"], [2.0, 1.2, 1.1, "yes"],
        [0.1, 0.8, -0.95, "no"], [1.5, 0.5, 1.75, "yes"], [0.3, 1.5, -2.05, "no"],
        [1.2, 1.0, 0.3, "yes"], [0.8, 1.4, -1.1, "no"], [1.8, 0.9, 1.4, "yes"],
        [0.2, 0.4, 0.0, "no"],
      ],
    },
    code: `import numpy as np

w = np.array([1.5, -2.0])      # weights: how much each input matters
b = 0.5                        # bias: shifts the tipping point

def neuron(x):
    score = np.dot(w, x) + b
    return score > 0           # fire if the score is positive

print(neuron([1.0, 0.2]))      # True`,
  },

  "activation-functions": {
    intro:
      "Activations are the small nonlinear bends applied after each weighted sum. Without them a deep network collapses into one linear model; with them, stacked layers can approximate any function. ReLU dominates in practice because its gradient does not vanish for positive inputs.",
    dataset: {
      caption: "The same input z through three activations. Note where each one flattens.",
      columns: ["z", "ReLU(z)", "sigmoid(z)", "tanh(z)"],
      rows: [
        [-3, 0, 0.05, -1.0], [-2, 0, 0.12, -0.96], [-1, 0, 0.27, -0.76],
        [-0.5, 0, 0.38, -0.46], [0, 0, 0.5, 0.0], [0.5, 0.5, 0.62, 0.46],
        [1, 1, 0.73, 0.76], [2, 2, 0.88, 0.96], [3, 3, 0.95, 1.0],
      ],
    },
    code: `import numpy as np

def relu(z):    return np.maximum(0, z)
def sigmoid(z): return 1 / (1 + np.exp(-z))
def tanh(z):    return np.tanh(z)

z = np.linspace(-3, 3, 7)
print(relu(z))        # the bend that lets layers stack usefully`,
  },

  "loss-functions": {
    intro:
      "The loss function is the single number training tries to push down, so it silently defines what the model cares about. MSE punishes big misses hard (outliers dominate), MAE treats all misses evenly, and cross-entropy punishes confident wrong answers most of all.",
    dataset: {
      caption: "The same predictions scored two ways. Watch row 5: one outlier owns the MSE.",
      columns: ["true y", "predicted ŷ", "squared error", "absolute error"],
      rows: [
        [10, 11, 1, 1], [15, 13, 4, 2], [8, 9, 1, 1], [20, 18, 4, 2],
        [12, 30, 324, 18], [16, 15, 1, 1], [9, 10, 1, 1], [14, 12, 4, 2],
      ],
    },
    code: `import numpy as np

y    = np.array([10, 15, 8, 20, 12, 16])
yhat = np.array([11, 13, 9, 18, 30, 15])   # one big miss

mse = np.mean((y - yhat) ** 2)   # 56.7, dominated by the outlier
mae = np.mean(np.abs(y - yhat))  # 4.2, barely notices it
print(mse, mae)                  # the loss you pick is the behavior you get`,
  },

  optimizers: {
    intro:
      "Optimizers decide how to use the gradient: plain SGD steps straight downhill, momentum keeps a running velocity so it stops zigzagging in narrow valleys, and Adam additionally adapts the step size per parameter. The right optimizer is often the difference between training in hours and not training at all.",
    dataset: {
      caption: "The same network trained with two optimizers. Same gradients, different journeys.",
      columns: ["epoch", "loss (SGD)", "loss (Adam)"],
      rows: [
        [1, 2.31, 2.29], [2, 2.18, 1.74], [3, 2.05, 1.21], [4, 1.91, 0.82],
        [5, 1.78, 0.55], [6, 1.66, 0.38], [7, 1.55, 0.27], [8, 1.45, 0.21],
        [9, 1.36, 0.17], [10, 1.28, 0.15],
      ],
    },
    code: `import torch

# same model, two ways to roll downhill
opt_sgd  = torch.optim.SGD(model.parameters(), lr=0.01)
opt_mom  = torch.optim.SGD(model.parameters(), lr=0.01, momentum=0.9)
opt_adam = torch.optim.Adam(model.parameters(), lr=0.001)

loss.backward()      # compute gradients
opt_adam.step()      # the optimizer decides the actual move`,
  },

  "bias-variance": {
    intro:
      "Every model's error splits into bias (too simple to capture the pattern), variance (so flexible it memorizes each sample's noise), and irreducible noise. You cannot minimize bias and variance at once; choosing model complexity is choosing your position on this trade.",
    dataset: {
      caption: "Polynomial degree vs error. Training error always falls; validation error makes a U.",
      columns: ["degree", "train error", "validation error"],
      rows: [
        [1, 4.82, 5.10], [2, 2.15, 2.48], [3, 1.41, 1.65], [4, 1.12, 1.58],
        [5, 0.89, 1.74], [6, 0.61, 2.21], [7, 0.38, 3.05], [8, 0.19, 4.6],
        [9, 0.07, 7.2], [10, 0.02, 11.8],
      ],
    },
    code: `from sklearn.model_selection import validation_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
import numpy as np

train_err, val_err = validation_curve(
    make_pipeline(PolynomialFeatures(), LinearRegression()),
    X, y, param_name="polynomialfeatures__degree",
    param_range=range(1, 11), cv=5)
# pick the degree at the bottom of the validation U`,
  },

  rnn: {
    intro:
      "A recurrent network reads a sequence one step at a time, carrying a hidden state forward like a running summary. The same weights apply at every step, which is elegant but fragile: repeated multiplication makes early information shrink or blow up, the famous vanishing-gradient problem.",
    dataset: {
      caption: "Daily temperatures as a sequence. The RNN predicts each next value from its memory.",
      columns: ["day", "temp (°C)", "next day (target)"],
      rows: [
        [1, 14.2, 15.1], [2, 15.1, 16.0], [3, 16.0, 15.4], [4, 15.4, 13.9],
        [5, 13.9, 12.8], [6, 12.8, 13.5], [7, 13.5, 14.6], [8, 14.6, 15.8],
        [9, 15.8, 16.3], [10, 16.3, 15.9],
      ],
    },
    code: `import torch.nn as nn

rnn = nn.RNN(input_size=1, hidden_size=16, batch_first=True)
head = nn.Linear(16, 1)

out, h = rnn(temps)            # h carries the "sticky note" forward
pred = head(out[:, -1])        # predict tomorrow from the final state`,
  },

  cnn: {
    intro:
      "A convolutional network slides one small filter across the whole image, so it learns a pattern once and detects it anywhere. That weight sharing slashes parameters by orders of magnitude and is why computer vision works: edges in early layers, textures and shapes deeper in.",
    dataset: {
      caption: "A 5x5 image patch (a bright vertical edge) that a 3x3 edge filter will light up on.",
      columns: ["col 1", "col 2", "col 3", "col 4", "col 5"],
      rows: [
        [0, 0, 255, 255, 255], [0, 0, 255, 255, 255], [0, 0, 255, 255, 255],
        [0, 0, 255, 255, 255], [0, 0, 255, 255, 255],
      ],
    },
    code: `import torch.nn as nn

cnn = nn.Sequential(
    nn.Conv2d(1, 8, kernel_size=3),   # 8 filters, 3x3 each: 80 params
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Flatten(),
    nn.Linear(8 * 13 * 13, 10),
)
# a dense layer on the raw 28x28 image would need 100x more weights`,
  },

  transformers: {
    intro:
      "Transformers let every token look at every other token at once and decide what matters: attention. No recurrence means training parallelizes over the whole sequence, which is why this architecture scaled into modern language models. The math is just dot products and a softmax.",
    dataset: {
      caption: "Attention weights for the word \"sat\" in \"the cat sat on the mat\". It looks at its subject.",
      columns: ["token", "attention from \"sat\""],
      rows: [
        ["the", 0.04], ["cat", 0.52], ["sat", 0.18], ["on", 0.06],
        ["the", 0.03], ["mat", 0.17],
      ],
    },
    code: `import numpy as np

def attention(Q, K, V):
    scores = Q @ K.T / np.sqrt(K.shape[-1])   # similarity of queries, keys
    weights = np.exp(scores)
    weights /= weights.sum(axis=-1, keepdims=True)   # softmax
    return weights @ V                        # mix values by relevance

# that's it. Stack it, multi-head it, and you have a transformer.`,
  },

  "reinforcement-learning": {
    intro:
      "Reinforcement learning trains an agent through trial, error, and reward, with no labeled answers at all. The agent learns a value for each action in each state (the Q-table here), balancing exploring new moves against exploiting known good ones. The same loop, scaled up, plays Go and controls robots.",
    dataset: {
      caption: "An episode log from a grid world. Reward only arrives at the goal; Q-learning spreads it backward.",
      columns: ["step", "state", "action", "reward"],
      rows: [
        [1, "(0,0)", "right", 0], [2, "(0,1)", "right", 0], [3, "(0,2)", "down", 0],
        [4, "(1,2)", "down", 0], [5, "(2,2)", "left", -1], [6, "(2,1)", "right", 0],
        [7, "(2,2)", "down", 0], [8, "(3,2)", "right", 10],
      ],
    },
    code: `# Q-learning: the update at the heart of the sandbox
for episode in range(500):
    s = env.reset()
    while not done:
        a = best_action(s) if rand() > eps else random_action()
        s2, r, done = env.step(a)
        Q[s][a] += alpha * (r + gamma * max(Q[s2]) - Q[s][a])
        s = s2     # treats arrive late; gamma carries them back`,
  },
};
