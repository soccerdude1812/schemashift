"""
Train the Random Forest type classifier and save to disk.

Model: RandomForestClassifier(n_estimators=100, max_depth=15)
Training data: 140K synthetic samples (10K per class, 14 classes)
Output: backend/app/models/type_classifier.joblib + type_classifier_meta.json
"""

import os
import sys
import json
import time
import numpy as np

# Add project root to path for imports
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, project_root)

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib


def train_model():
    """Train the type classifier and save artifacts."""
    print("=" * 60)
    print("SchemaShift Type Classifier Training")
    print("=" * 60)

    # Step 1: Generate synthetic training data
    print("\nStep 1: Generating synthetic training data...")
    start_time = time.time()

    try:
        from app.training.synthetic_data import generate_training_data
        from app.ml.features import FEATURE_NAMES
    except ImportError:
        from backend.app.training.synthetic_data import generate_training_data
        from backend.app.ml.features import FEATURE_NAMES

    df = generate_training_data(samples_per_class=10_000, values_per_sample=100)
    gen_time = time.time() - start_time
    print(f"Generated {len(df)} samples in {gen_time:.1f}s")
    print(f"Class distribution:\n{df['label'].value_counts().to_string()}")

    # Step 2: Prepare features and labels
    print("\nStep 2: Preparing features and labels...")
    X = df[FEATURE_NAMES].values
    y = df['label'].values

    # Handle any NaN/inf values
    X = np.nan_to_num(X, nan=0.0, posinf=1.0, neginf=-1.0)

    # Step 3: Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    # Step 4: Train the model
    print("\nStep 3: Training RandomForestClassifier...")
    train_start = time.time()

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,  # Use all CPU cores
        class_weight='balanced',
    )
    model.fit(X_train, y_train)
    train_time = time.time() - train_start
    print(f"Training completed in {train_time:.1f}s")

    # Step 5: Evaluate
    print("\nStep 4: Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    report = classification_report(y_test, y_pred, output_dict=True)
    print(classification_report(y_test, y_pred))

    # Step 6: Feature importance
    print("\nTop 10 most important features:")
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    for i in range(min(10, len(FEATURE_NAMES))):
        idx = indices[i]
        print(f"  {i+1}. {FEATURE_NAMES[idx]}: {importances[idx]:.4f}")

    # Step 7: Save model
    print("\nStep 5: Saving model artifacts...")
    models_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'models',
    )
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, 'type_classifier.joblib')
    meta_path = os.path.join(models_dir, 'type_classifier_meta.json')

    # Save model + classes together
    model_data = {
        'model': model,
        'classes': list(model.classes_),
    }
    joblib.dump(model_data, model_path, compress=3)
    print(f"Model saved to: {model_path}")

    # Save metadata
    meta = {
        'model_type': 'RandomForestClassifier',
        'n_estimators': 100,
        'max_depth': 15,
        'n_features': len(FEATURE_NAMES),
        'feature_names': FEATURE_NAMES,
        'classes': list(model.classes_),
        'n_classes': len(model.classes_),
        'training_samples': len(X_train),
        'test_samples': len(X_test),
        'accuracy': round(accuracy, 4),
        'per_class_f1': {
            cls: round(report[cls]['f1-score'], 4)
            for cls in model.classes_
            if cls in report
        },
        'feature_importances': {
            FEATURE_NAMES[i]: round(float(importances[i]), 4)
            for i in range(len(FEATURE_NAMES))
        },
        'training_time_seconds': round(train_time, 1),
        'total_time_seconds': round(time.time() - start_time, 1),
    }
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Metadata saved to: {meta_path}")

    # File sizes
    model_size = os.path.getsize(model_path)
    print(f"\nModel file size: {model_size / (1024*1024):.1f} MB")
    print(f"Total time: {time.time() - start_time:.1f}s")
    print("=" * 60)
    print("Training complete!")
    print("=" * 60)

    return accuracy


if __name__ == '__main__':
    accuracy = train_model()
    if accuracy < 0.85:
        print(f"\nWARNING: Model accuracy ({accuracy:.4f}) is below 85% threshold.")
        print("Consider reviewing synthetic data quality.")
    else:
        print(f"\nModel accuracy ({accuracy:.4f}) is above 85% threshold. Ready for deployment.")
