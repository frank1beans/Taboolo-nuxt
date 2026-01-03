import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering
from sklearn.preprocessing import normalize

# Try importing hdbscan, fallback to sklearn's HDBSCAN or Agglomerative
try:
    import hdbscan  # type: ignore

    HAS_HDBSCAN = True
    HDBSCAN_IMPL = "hdbscan"
except Exception:
    HAS_HDBSCAN = False
    HDBSCAN_IMPL = "none"
    try:
        from sklearn.cluster import HDBSCAN  # type: ignore

        HAS_HDBSCAN = True
        HDBSCAN_IMPL = "sklearn"
    except Exception:
        pass

logger = logging.getLogger(__name__)


@dataclass
class BasinLabels:
    """Conventional basin labels used by this pipeline."""
    BORDERLINE: str = "BORDERLINE"
    DISCOVERY: str = "DISCOVERY"
    NOISE: str = "NOISE"
    SMALL: str = "SMALL"  # used internally for small basins if needed


class GravitationalClustering:
    """
    Gravitational clustering:
      1) Build WBS6 prototypes (robust centroids).
      2) Attraction: cosine similarity to prototypes (best + second).
      3) Basin assignment:
          - CORE: passes threshold + margin
          - BORDERLINE: passes threshold but fails margin
          - UNASSIGNED: fails threshold
      4) Clustering:
          - within CORE basins (HDBSCAN preferred)
          - optional BORDERLINE clustering
          - optional DISCOVERY clustering on UNASSIGNED
    """

    def __init__(
        self,
        min_basin_size: int = 20,
        adaptive_percentile: int = 5,
        trim_fraction: float = 0.1,
        prototype_method: str = "median",
        basin_labels: BasinLabels = BasinLabels(),
        # behaviors
        small_basin_policy: str = "single_cluster",  # "single_cluster" | "singletons" | "noise"
        enable_borderline: bool = True,
        enable_discovery: bool = True,
        # discovery params
        discovery_min_cluster_size: int = 6,
        discovery_min_samples: int = 2,
    ):
        """
        Args:
            min_basin_size: Minimum #points in a basin to run HDBSCAN/Agglomerative.
            adaptive_percentile: Percentile of score_to_own to compute per-WBS6 attraction threshold.
            trim_fraction: Trim fraction for prototype_method="trimmed_mean".
            prototype_method: "median" | "trimmed_mean" | "mean".
            small_basin_policy:
                - "single_cluster": all points in small basin become one cluster (recommended)
                - "singletons": each point becomes its own cluster
                - "noise": mark as noise (old behavior; not recommended for your domain)
            enable_borderline: create BORDERLINE basin for threshold-pass but margin-fail cases.
            enable_discovery: cluster UNASSIGNED points into DISCOVERY clusters.
            discovery_*: parameters for discovery clustering.
        """
        self.min_basin_size = int(min_basin_size)
        self.adaptive_percentile = int(adaptive_percentile)
        self.trim_fraction = float(trim_fraction)
        self.prototype_method = str(prototype_method)

        self.labels = basin_labels
        self.small_basin_policy = str(small_basin_policy)
        if self.small_basin_policy not in {"single_cluster", "singletons", "noise"}:
            raise ValueError("small_basin_policy must be 'single_cluster', 'singletons', or 'noise'")

        self.enable_borderline = bool(enable_borderline)
        self.enable_discovery = bool(enable_discovery)
        self.discovery_min_cluster_size = int(discovery_min_cluster_size)
        self.discovery_min_samples = int(discovery_min_samples)

        self.prototypes_: Dict[str, np.ndarray] = {}
        self.basin_thresholds_: Dict[str, float] = {}

    # ---------- Utilities ----------

    def normalize_embeddings(self, X: np.ndarray) -> np.ndarray:
        """L2 Normalization of embeddings."""
        return normalize(X, norm="l2")

    def _stack_embeddings(self, df: pd.DataFrame, embedding_col: str) -> np.ndarray:
        """Safely stack embeddings from df column."""
        return np.stack(df[embedding_col].values)

    # ---------- Prototypes ----------

    def build_prototypes(
        self,
        df: pd.DataFrame,
        embedding_col: str = "embedding",
        wbs_col: str = "wbs6",
    ) -> Dict[str, np.ndarray]:
        """
        Computes the prototype (centroid) for each WBS6 category.
        Expected df columns: [wbs_col, embedding_col]
        """
        prototypes: Dict[str, np.ndarray] = {}
        grouped = df.groupby(wbs_col, dropna=False)

        for wbs6, group in grouped:
            if pd.isna(wbs6):
                continue

            emb = self._stack_embeddings(group, embedding_col)
            emb = self.normalize_embeddings(emb)

            if self.prototype_method == "median":
                proto = np.median(emb, axis=0)

            elif self.prototype_method == "trimmed_mean":
                lower = np.percentile(emb, 100 * self.trim_fraction, axis=0)
                upper = np.percentile(emb, 100 * (1 - self.trim_fraction), axis=0)
                clipped = np.clip(emb, lower, upper)
                proto = np.mean(clipped, axis=0)

            else:  # "mean" fallback
                proto = np.mean(emb, axis=0)

            proto = self.normalize_embeddings(proto.reshape(1, -1))[0]
            prototypes[str(wbs6)] = proto

        self.prototypes_ = prototypes
        return prototypes

    # ---------- Attraction ----------

    def attraction_scores(
        self,
        df: pd.DataFrame,
        embedding_col: str = "embedding",
        id_col: str = "id",
        top_k: int = 2,
        return_matrix: bool = False,
    ) -> Tuple[pd.DataFrame, Optional[np.ndarray], np.ndarray]:
        """
        Computes similarity of every point to every prototype.

        Returns:
            scores_df columns:
                [id_col, best_wbs6, best_score, second_wbs6, second_score]
            sim_matrix: optional (N, M) if return_matrix=True else None
            proto_keys: numpy array of prototype keys (order used)
        """
        if not self.prototypes_:
            raise ValueError("Prototypes not built yet.")
        if top_k < 2:
            raise ValueError("top_k must be >= 2 to compute best+second.")

        X = self._stack_embeddings(df, embedding_col)
        X = self.normalize_embeddings(X)

        proto_keys = np.array(list(self.prototypes_.keys()))
        P = np.vstack([self.prototypes_[k] for k in proto_keys])  # (M, D)

        sim = X @ P.T  # (N, M), cosine because normalized

        # top-2 efficiently
        top2_idx = np.argpartition(sim, -2, axis=1)[:, -2:]
        top2_scores = np.take_along_axis(sim, top2_idx, axis=1)

        # order desc
        order = np.argsort(top2_scores, axis=1)[:, ::-1]
        top2_idx = np.take_along_axis(top2_idx, order, axis=1)
        top2_scores = np.take_along_axis(top2_scores, order, axis=1)

        best_idx = top2_idx[:, 0]
        second_idx = top2_idx[:, 1]

        ids = df[id_col].values if id_col in df.columns else np.arange(len(df))

        out = pd.DataFrame(
            {
                id_col: ids,
                "best_wbs6": proto_keys[best_idx],
                "best_score": top2_scores[:, 0],
                "second_wbs6": proto_keys[second_idx],
                "second_score": top2_scores[:, 1],
            }
        )

        sim_matrix = sim if return_matrix else None
        return out, sim_matrix, proto_keys

    # ---------- Basin assignment ----------

    def assign_basins(
        self,
        df: pd.DataFrame,
        attraction_df: pd.DataFrame,
        wbs_col: str = "wbs6",
        embedding_col: str = "embedding",
        id_col: str = "id",
        margin: float = 0.0,
        threshold_fallback: float = 0.45,
        min_points_for_threshold: int = 10,
    ) -> pd.DataFrame:
        """
        Assign points to basins based on adaptive thresholds computed from native points.

        Threshold rule:
          threshold[wbs6] = percentile(score_to_own for points with original wbs6, adaptive_percentile)

        Membership:
          CORE      => best_score >= threshold[target] AND (best_score-second_score) >= margin
          BORDERLINE=> best_score >= threshold[target] AND margin fails (if enable_borderline)
          UNASSIGNED=> threshold fails

        Notes:
        - score_to_own = cosine(point, prototype[point.wbs6])  (vectorized)
        """
        merged = df.copy()

        # align attraction_df rows to merged rows: assumes same order as df
        merged["target_basin"] = attraction_df["best_wbs6"].values
        merged["attraction_score"] = attraction_df["best_score"].values
        merged["second_score"] = attraction_df["second_score"].values

        # score_to_own vectorized
        X = self._stack_embeddings(merged, embedding_col)
        X = self.normalize_embeddings(X)

        own_wbs = merged[wbs_col].astype(str).values
        dim = X.shape[1]

        P_own = np.vstack([self.prototypes_.get(w, np.zeros(dim, dtype=float)) for w in own_wbs])
        P_own = self.normalize_embeddings(P_own)
        merged["score_to_own"] = np.sum(X * P_own, axis=1)

        # thresholds from natives
        thresholds: Dict[str, float] = {}
        for wbs6, group in merged.groupby(wbs_col, dropna=False):
            if pd.isna(wbs6):
                continue
            w = str(wbs6)
            if len(group) < min_points_for_threshold:
                thresholds[w] = float(threshold_fallback)
            else:
                thresholds[w] = float(np.percentile(group["score_to_own"], self.adaptive_percentile))

        self.basin_thresholds_ = thresholds

        thr_target = merged["target_basin"].map(lambda w: thresholds.get(str(w), threshold_fallback)).astype(float)

        ok_thr = merged["attraction_score"] >= thr_target
        ok_margin = (merged["attraction_score"] - merged["second_score"]) >= float(margin)

        merged["assigned_basin"] = None
        merged.loc[ok_thr & ok_margin, "assigned_basin"] = merged.loc[ok_thr & ok_margin, "target_basin"]

        if self.enable_borderline:
            merged.loc[ok_thr & ~ok_margin, "assigned_basin"] = self.labels.BORDERLINE

        merged["is_basin_noise"] = merged["assigned_basin"].isna()

        return merged

    # ---------- Clustering within basin ----------

    def _small_basin_labels(self, n_points: int) -> Tuple[np.ndarray, np.ndarray]:
        """
        Decide labels/probs for small basins based on policy.
        """
        if self.small_basin_policy == "noise":
            return np.full(n_points, -1, dtype=int), np.zeros(n_points, dtype=float)

        if self.small_basin_policy == "singletons":
            # each point is its own cluster label
            return np.arange(n_points, dtype=int), np.ones(n_points, dtype=float)

        # default: single_cluster
        return np.zeros(n_points, dtype=int), np.ones(n_points, dtype=float)

    def cluster_within_basin(
        self,
        df_basin: pd.DataFrame,
        embedding_col: str = "embedding",
        min_cluster_size: Optional[int] = None,
        min_samples: Optional[int] = None,
        distance_threshold: float = 0.3,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Runs HDBSCAN (or fallback Agglomerative) on points within a single basin.
        Returns: labels, probability_scores
        """
        n_points = len(df_basin)
        if n_points == 0:
            return np.array([], dtype=int), np.array([], dtype=float)

        if n_points < self.min_basin_size:
            # IMPORTANT: small basin != noise in your domain
            return self._small_basin_labels(n_points)

        X = self._stack_embeddings(df_basin, embedding_col)
        X = self.normalize_embeddings(X)

        # Adaptive-ish defaults if not provided
        if min_cluster_size is None:
            min_cluster_size = max(5, int(n_points * 0.05))
        if min_samples is None:
            min_samples = max(2, int(min_cluster_size * 0.5))

        # Prefer HDBSCAN if available
        if HAS_HDBSCAN:
            try:
                if HDBSCAN_IMPL == "hdbscan":
                    clusterer = hdbscan.HDBSCAN(
                        min_cluster_size=min_cluster_size,
                        min_samples=min_samples,
                        metric="euclidean",  # normalized => monotonic w/ cosine
                        cluster_selection_method="eom",
                    )
                    labels = clusterer.fit_predict(X)
                    probs = getattr(clusterer, "probabilities_", np.ones(n_points, dtype=float))
                    return labels, probs

                if HDBSCAN_IMPL == "sklearn":
                    clusterer = HDBSCAN(
                        min_cluster_size=min_cluster_size,
                        metric="euclidean",
                    )
                    labels = clusterer.fit_predict(X)
                    probs = getattr(clusterer, "probabilities_", np.ones(n_points, dtype=float))
                    return labels, probs

            except Exception as e:
                logger.warning(f"HDBSCAN failed ({e}). Falling back to Agglomerative.")

        # Fallback: Agglomerative Clustering with distance threshold
        try:
            agg = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=distance_threshold,
                metric="cosine",
                linkage="average",
            )
        except TypeError:
            agg = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=distance_threshold,
                affinity="cosine",
                linkage="average",
            )

        labels = agg.fit_predict(X)
        probs = np.ones(n_points, dtype=float)
        return labels, probs

    # ---------- Explain clusters ----------

    def explain_clusters(
        self,
        df: pd.DataFrame,
        cluster_col: str,
        text_col: str,
        embedding_col: str = "embedding",
        max_keywords: int = 5,
        max_examples: int = 10,
        stop_words=None,
    ) -> Dict[str, Any]:
        """
        Extracts keywords and central examples for each cluster.
        """
        explanations: Dict[str, Any] = {}

        text_available = text_col in df.columns

        tfidf = None
        feature_names = None
        tfidf_matrix = None

        if text_available:
            docs = df[text_col].fillna("").astype(str).tolist()
            if docs and not all(d.strip() == "" for d in docs):
                try:
                    tfidf = TfidfVectorizer(max_features=2000, stop_words=stop_words)
                    tfidf_matrix = tfidf.fit_transform(docs)
                    feature_names = np.array(tfidf.get_feature_names_out())
                except Exception:
                    tfidf = None

        for cid in df[cluster_col].unique():
            if cid == -1:
                continue

            cluster_mask = df[cluster_col] == cid
            cluster_points = df[cluster_mask]
            if len(cluster_points) == 0:
                continue

            X_clust = np.stack(cluster_points[embedding_col].values)
            X_clust = self.normalize_embeddings(X_clust)

            centroid = np.mean(X_clust, axis=0)
            centroid = self.normalize_embeddings(centroid.reshape(1, -1))[0]

            sims = (X_clust @ centroid.reshape(-1, 1)).flatten()
            top_k_idx = np.argsort(sims)[-max_examples:][::-1]
            central = cluster_points.iloc[top_k_idx]

            central_examples = [
                {"id": r.get("id"), "desc": r.get(text_col) if text_available else None}
                for _, r in central.iterrows()
            ]

            keywords = []
            if tfidf is not None and tfidf_matrix is not None and feature_names is not None:
                subset_indices = np.where(cluster_mask.values)[0]
                cluster_tfidf = tfidf_matrix[subset_indices]
                avg_tfidf = np.asarray(cluster_tfidf.mean(axis=0)).flatten()
                top_w_idx = np.argsort(avg_tfidf)[-max_keywords:][::-1]
                keywords = feature_names[top_w_idx].tolist()

            explanations[str(cid)] = {
                "size": int(len(cluster_points)),
                "central_examples": central_examples,
                "keywords": keywords,
            }

        return explanations

    # ---------- Main pipeline ----------

    def fit_predict(
        self,
        df: pd.DataFrame,
        embedding_col: str = "embedding",
        wbs_col: str = "wbs6",
        id_col: str = "id",
        text_col: str = "description",
        # --- gravitational controls ---
        margin: float = 0.08,
        top_k: int = 2,
        # --- clustering controls (optional overrides) ---
        hdb_min_cluster_size: Optional[int] = None,
        hdb_min_samples: Optional[int] = None,
        agg_distance_threshold: float = 0.3,
        # --- explanation ---
        tfidf_stop_words=None,
        # --- strict mode ---
        strict_basins: bool = False,
        # --- external prototypes ---
        skip_prototype_build: bool = False,
        # --- basin threshold tuning ---
        threshold_fallback: float = 0.45,
        min_points_for_threshold: int = 10,
        # --- borderline clustering ---
        cluster_borderline: bool = True,
        borderline_min_cluster_size: int = 6,
        borderline_min_samples: int = 2,
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Main pipeline execution.

        Returns:
            df_out: input df plus:
                target_basin, attraction_score, second_score, score_to_own,
                assigned_basin, is_basin_noise,
                cluster_id, cluster_prob
            cluster_reports: dict by basin -> explanations
        """
        if df.empty:
            return df.copy(), {}

        # 1) Prototypes
        if not skip_prototype_build or not self.prototypes_:
            self.build_prototypes(df, embedding_col=embedding_col, wbs_col=wbs_col)
        else:
            logger.info(f"Skipping prototype build, using {len(self.prototypes_)} pre-computed prototypes")

        # 2) Attraction (best+second)
        attraction_df, _, _ = self.attraction_scores(
            df,
            embedding_col=embedding_col,
            id_col=id_col,
            top_k=top_k,
            return_matrix=False,
        )

        # 3) Basins
        if strict_basins:
            # Force assignment to own WBS6, but still compute score to own
            df_assigned = df.copy()

            df_assigned["target_basin"] = attraction_df["best_wbs6"].values  # reference
            df_assigned["second_score"] = attraction_df["second_score"].values

            X = self._stack_embeddings(df_assigned, embedding_col)
            X = self.normalize_embeddings(X)

            own_wbs = df_assigned[wbs_col].astype(str).values
            dim = X.shape[1]

            P_own = np.zeros((len(own_wbs), dim), dtype=float)
            for i, w in enumerate(own_wbs):
                if w in self.prototypes_:
                    P_own[i] = self.prototypes_[w]

            norms = np.linalg.norm(P_own, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            P_own = P_own / norms

            scores_own = np.sum(X * P_own, axis=1)
            df_assigned["attraction_score"] = scores_own
            df_assigned["score_to_own"] = scores_own

            has_proto = np.array([w in self.prototypes_ for w in own_wbs])
            df_assigned["assigned_basin"] = df_assigned[wbs_col].astype(str)
            df_assigned.loc[~has_proto, "assigned_basin"] = None
            df_assigned["is_basin_noise"] = ~has_proto

        else:
            df_assigned = self.assign_basins(
                df,
                attraction_df=attraction_df,
                wbs_col=wbs_col,
                embedding_col=embedding_col,
                id_col=id_col,
                margin=margin,
                threshold_fallback=threshold_fallback,
                min_points_for_threshold=min_points_for_threshold,
            )

        # 4) Clustering per basin
        df_assigned["cluster_id"] = self.labels.NOISE
        df_assigned["cluster_prob"] = 0.0

        cluster_reports: Dict[str, Any] = {}

        # --- CORE basins (exclude BORDERLINE + UNASSIGNED) ---
        core_mask = df_assigned["assigned_basin"].notna() & (df_assigned["assigned_basin"].astype(str) != self.labels.BORDERLINE)
        basins = df_assigned.loc[core_mask, "assigned_basin"].astype(str).unique()

        for basin_name in basins:
            mask = df_assigned["assigned_basin"].astype(str) == basin_name
            subset = df_assigned[mask].copy()
            if subset.empty:
                continue

            labels, probs = self.cluster_within_basin(
                subset,
                embedding_col=embedding_col,
                min_cluster_size=hdb_min_cluster_size,
                min_samples=hdb_min_samples,
                distance_threshold=agg_distance_threshold,
            )

            formatted = [
                f"{basin_name}::{self.labels.NOISE}" if l == -1 else f"{basin_name}::{int(l)}"
                for l in labels
            ]
            df_assigned.loc[mask, "cluster_id"] = formatted
            df_assigned.loc[mask, "cluster_prob"] = probs

            subset["temp_cluster"] = labels
            cluster_reports[basin_name] = self.explain_clusters(
                subset,
                cluster_col="temp_cluster",
                text_col=text_col,
                embedding_col=embedding_col,
                stop_words=tfidf_stop_words,
            )

        # --- BORDERLINE clustering (optional) ---
        if self.enable_borderline and cluster_borderline:
            bmask = df_assigned["assigned_basin"].astype(str) == self.labels.BORDERLINE
            if bmask.any():
                bdf = df_assigned[bmask].copy()

                labels, probs = self.cluster_within_basin(
                    bdf,
                    embedding_col=embedding_col,
                    min_cluster_size=borderline_min_cluster_size,
                    min_samples=borderline_min_samples,
                    distance_threshold=agg_distance_threshold,
                )

                formatted = [
                    f"{self.labels.BORDERLINE}::{self.labels.NOISE}" if l == -1 else f"{self.labels.BORDERLINE}::{int(l)}"
                    for l in labels
                ]
                df_assigned.loc[bmask, "cluster_id"] = formatted
                df_assigned.loc[bmask, "cluster_prob"] = probs

                bdf["temp_cluster"] = labels
                cluster_reports[self.labels.BORDERLINE] = self.explain_clusters(
                    bdf,
                    cluster_col="temp_cluster",
                    text_col=text_col,
                    embedding_col=embedding_col,
                    stop_words=tfidf_stop_words,
                )

        # --- DISCOVERY clustering on UNASSIGNED (optional) ---
        if self.enable_discovery:
            umask = df_assigned["assigned_basin"].isna()
            if umask.any():
                udf = df_assigned[umask].copy()

                labels, probs = self.cluster_within_basin(
                    udf,
                    embedding_col=embedding_col,
                    min_cluster_size=self.discovery_min_cluster_size,
                    min_samples=self.discovery_min_samples,
                    distance_threshold=agg_distance_threshold,
                )

                formatted = [
                    f"{self.labels.DISCOVERY}::{self.labels.NOISE}" if l == -1 else f"{self.labels.DISCOVERY}::{int(l)}"
                    for l in labels
                ]
                df_assigned.loc[umask, "cluster_id"] = formatted
                df_assigned.loc[umask, "cluster_prob"] = probs

                udf["temp_cluster"] = labels
                cluster_reports[self.labels.DISCOVERY] = self.explain_clusters(
                    udf,
                    cluster_col="temp_cluster",
                    text_col=text_col,
                    embedding_col=embedding_col,
                    stop_words=tfidf_stop_words,
                )

        return df_assigned, cluster_reports
