"""
Generate synthetic training data for the type classifier.

Produces 10K samples per type class (14 classes = 140K total samples).
Each sample is a list of values that realistically represents what a column
of that type would contain in a real-world CSV file.
"""

import random
import string
import uuid
from datetime import datetime, timedelta
from typing import List, Callable, Dict

import numpy as np
import pandas as pd


# Number of samples (column instances) per type class
SAMPLES_PER_CLASS = 10_000

# Number of values per synthetic column sample
VALUES_PER_SAMPLE = 100

# Null injection rate range
NULL_RATE_RANGE = (0.0, 0.15)


def _inject_nulls(values: List[str], null_rate: float) -> List[str]:
    """Replace a fraction of values with None to simulate null rates."""
    result = values.copy()
    n_nulls = int(len(result) * null_rate)
    if n_nulls > 0:
        indices = random.sample(range(len(result)), min(n_nulls, len(result)))
        for idx in indices:
            result[idx] = None  # type: ignore
    return result


def _add_noise(values: List[str], noise_rate: float = 0.02) -> List[str]:
    """Add some noise values (typos, wrong types) to make training more robust."""
    result = values.copy()
    n_noise = int(len(result) * noise_rate)
    if n_noise > 0:
        noise_values = [
            '', 'N/A', 'null', 'NA', '-', '?', 'unknown', 'none',
            '###', 'err', 'MISSING', '...',
        ]
        indices = random.sample(range(len(result)), min(n_noise, len(result)))
        for idx in indices:
            result[idx] = random.choice(noise_values)
    return result


# ---- Type-specific value generators ----

def gen_integer_values(n: int) -> List[str]:
    """Generate realistic integer values."""
    style = random.choice(['small', 'large', 'ids', 'counts', 'negative', 'mixed'])
    values = []
    for _ in range(n):
        if style == 'small':
            values.append(str(random.randint(0, 100)))
        elif style == 'large':
            values.append(str(random.randint(1000, 999999)))
        elif style == 'ids':
            values.append(str(random.randint(1, 100000)))
        elif style == 'counts':
            values.append(str(random.randint(0, 50)))
        elif style == 'negative':
            values.append(str(random.randint(-1000, 1000)))
        else:
            values.append(str(random.randint(-10000, 10000)))
    return values


def gen_float_values(n: int) -> List[str]:
    """Generate realistic float values."""
    style = random.choice(['price', 'rate', 'metric', 'scientific', 'small'])
    values = []
    for _ in range(n):
        if style == 'price':
            values.append(f"{random.uniform(0.01, 9999.99):.2f}")
        elif style == 'rate':
            values.append(f"{random.uniform(0, 1):.4f}")
        elif style == 'metric':
            values.append(f"{random.uniform(-100, 100):.3f}")
        elif style == 'scientific':
            values.append(f"{random.uniform(0.001, 99.999):.6f}")
        else:
            values.append(f"{random.uniform(0, 10):.2f}")
    return values


def gen_boolean_values(n: int) -> List[str]:
    """Generate realistic boolean values in various formats."""
    format_choice = random.choice([
        ('true', 'false'),
        ('True', 'False'),
        ('TRUE', 'FALSE'),
        ('yes', 'no'),
        ('Yes', 'No'),
        ('1', '0'),
        ('Y', 'N'),
        ('y', 'n'),
        ('T', 'F'),
    ])
    return [random.choice(format_choice) for _ in range(n)]


def gen_date_values(n: int) -> List[str]:
    """Generate realistic date values in various formats."""
    base = datetime(2020, 1, 1)
    fmt = random.choice([
        '%Y-%m-%d',
        '%m/%d/%Y',
        '%d/%m/%Y',
        '%Y/%m/%d',
        '%m-%d-%Y',
        '%d-%m-%Y',
        '%b %d, %Y',
        '%d %b %Y',
    ])
    values = []
    for _ in range(n):
        delta = timedelta(days=random.randint(0, 2000))
        dt = base + delta
        values.append(dt.strftime(fmt))
    return values


def gen_datetime_values(n: int) -> List[str]:
    """Generate realistic datetime values."""
    base = datetime(2020, 1, 1)
    fmt = random.choice([
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%m/%d/%Y %H:%M',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%d %H:%M:%S.%f',
    ])
    values = []
    for _ in range(n):
        delta = timedelta(
            days=random.randint(0, 2000),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59),
        )
        dt = base + delta
        values.append(dt.strftime(fmt))
    return values


def gen_email_values(n: int) -> List[str]:
    """Generate realistic email addresses."""
    domains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'company.com', 'example.org', 'test.io', 'work.co',
        'mail.com', 'protonmail.com', 'icloud.com', 'aol.com',
    ]
    first_names = [
        'john', 'jane', 'mike', 'sarah', 'david', 'emma',
        'alex', 'chris', 'pat', 'sam', 'taylor', 'morgan',
        'casey', 'jordan', 'riley', 'drew', 'quinn', 'blake',
    ]
    last_names = [
        'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia',
        'miller', 'davis', 'rodriguez', 'martinez', 'wilson', 'anderson',
    ]
    values = []
    for _ in range(n):
        style = random.choice(['first.last', 'first_last', 'firstlast', 'first+num'])
        first = random.choice(first_names)
        last = random.choice(last_names)
        domain = random.choice(domains)
        if style == 'first.last':
            values.append(f"{first}.{last}@{domain}")
        elif style == 'first_last':
            values.append(f"{first}_{last}@{domain}")
        elif style == 'firstlast':
            values.append(f"{first}{last}@{domain}")
        else:
            values.append(f"{first}{random.randint(1, 999)}@{domain}")
    return values


def gen_url_values(n: int) -> List[str]:
    """Generate realistic URL values."""
    protocols = ['https://', 'http://']
    domains = [
        'example.com', 'google.com', 'github.com', 'stackoverflow.com',
        'medium.com', 'wikipedia.org', 'amazon.com', 'twitter.com',
        'linkedin.com', 'youtube.com', 'reddit.com', 'nytimes.com',
    ]
    paths = [
        '', '/home', '/about', '/products', '/blog',
        '/docs/guide', '/api/v1/users', '/search?q=test',
        '/article/12345', '/page/2', '/category/tech',
    ]
    values = []
    for _ in range(n):
        proto = random.choice(protocols)
        domain = random.choice(domains)
        path = random.choice(paths)
        values.append(f"{proto}{domain}{path}")
    return values


def gen_phone_values(n: int) -> List[str]:
    """Generate realistic phone number values."""
    formats = [
        lambda: f"+1{random.randint(200,999)}{random.randint(200,999)}{random.randint(1000,9999)}",
        lambda: f"({random.randint(200,999)}) {random.randint(200,999)}-{random.randint(1000,9999)}",
        lambda: f"{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}",
        lambda: f"{random.randint(200,999)}.{random.randint(200,999)}.{random.randint(1000,9999)}",
        lambda: f"+44 {random.randint(1000,9999)} {random.randint(100000,999999)}",
        lambda: f"{random.randint(200,999)} {random.randint(200,999)} {random.randint(1000,9999)}",
    ]
    return [random.choice(formats)() for _ in range(n)]


def gen_uuid_values(n: int) -> List[str]:
    """Generate UUID v4 values."""
    return [str(uuid.uuid4()) for _ in range(n)]


def gen_currency_values(n: int) -> List[str]:
    """Generate currency values with symbols."""
    symbols = ['$', '\u20ac', '\u00a3', '\u00a5']
    values = []
    for _ in range(n):
        symbol = random.choice(symbols)
        amount = random.uniform(0.01, 99999.99)
        if random.random() < 0.3:
            # Add comma separators for large amounts
            formatted = f"{amount:,.2f}"
        else:
            formatted = f"{amount:.2f}"
        values.append(f"{symbol}{formatted}")
    return values


def gen_percentage_values(n: int) -> List[str]:
    """Generate percentage values."""
    values = []
    for _ in range(n):
        style = random.choice(['int', 'float1', 'float2'])
        if style == 'int':
            values.append(f"{random.randint(0, 100)}%")
        elif style == 'float1':
            values.append(f"{random.uniform(0, 100):.1f}%")
        else:
            values.append(f"{random.uniform(0, 100):.2f}%")
    return values


def gen_zip_code_values(n: int) -> List[str]:
    """Generate US zip code values."""
    values = []
    for _ in range(n):
        if random.random() < 0.7:
            # 5-digit zip
            values.append(f"{random.randint(10, 99999):05d}")
        else:
            # ZIP+4 format
            values.append(f"{random.randint(10, 99999):05d}-{random.randint(0, 9999):04d}")
    return values


def gen_category_values(n: int) -> List[str]:
    """Generate categorical values with low cardinality."""
    category_sets = [
        ['Small', 'Medium', 'Large', 'XL'],
        ['Active', 'Inactive', 'Pending', 'Cancelled'],
        ['Low', 'Medium', 'High', 'Critical'],
        ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
        ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'],
        ['Free', 'Basic', 'Pro', 'Enterprise'],
        ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP'],
        ['Draft', 'Published', 'Archived'],
        ['Paid', 'Unpaid', 'Overdue', 'Refunded'],
        ['New', 'Returning', 'VIP'],
    ]
    categories = random.choice(category_sets)
    return [random.choice(categories) for _ in range(n)]


def gen_text_values(n: int) -> List[str]:
    """Generate free-form text values."""
    words = [
        'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur',
        'data', 'analysis', 'report', 'customer', 'feedback', 'review',
        'important', 'update', 'meeting', 'notes', 'summary', 'action',
        'project', 'delivery', 'tracking', 'inventory', 'order', 'payment',
        'scheduled', 'completed', 'pending', 'approved', 'rejected',
    ]
    values = []
    for _ in range(n):
        length = random.randint(3, 20)
        text = ' '.join(random.choices(words, k=length))
        if random.random() < 0.3:
            text = text.capitalize()
        if random.random() < 0.2:
            text += '.'
        values.append(text)
    return values


# Registry of generators
GENERATORS: Dict[str, Callable[[int], List[str]]] = {
    'integer': gen_integer_values,
    'float': gen_float_values,
    'boolean': gen_boolean_values,
    'date': gen_date_values,
    'datetime': gen_datetime_values,
    'email': gen_email_values,
    'url': gen_url_values,
    'phone': gen_phone_values,
    'uuid': gen_uuid_values,
    'currency': gen_currency_values,
    'percentage': gen_percentage_values,
    'zip_code': gen_zip_code_values,
    'category': gen_category_values,
    'text': gen_text_values,
}


def generate_training_data(
    samples_per_class: int = SAMPLES_PER_CLASS,
    values_per_sample: int = VALUES_PER_SAMPLE,
) -> pd.DataFrame:
    """
    Generate the complete synthetic training dataset.

    Each row represents one column sample with its 28 features and label.

    Args:
        samples_per_class: Number of synthetic columns per type class.
        values_per_sample: Number of values per synthetic column.

    Returns:
        DataFrame with 28 feature columns + 'label' column.
    """
    try:
        from app.ml.features import extract_features, FEATURE_NAMES
    except ImportError:
        from backend.app.ml.features import extract_features, FEATURE_NAMES

    all_features = []
    all_labels = []

    for type_name, generator in GENERATORS.items():
        print(f"Generating {samples_per_class} samples for type: {type_name}...")
        for i in range(samples_per_class):
            # Generate synthetic values
            values = generator(values_per_sample)

            # Randomly inject nulls
            null_rate = random.uniform(*NULL_RATE_RANGE)
            values = _inject_nulls(values, null_rate)

            # Randomly add noise
            if random.random() < 0.3:
                values = _add_noise(values, noise_rate=random.uniform(0.01, 0.05))

            # Convert to pandas Series
            series = pd.Series(values)

            # Extract features
            features = extract_features(series)

            all_features.append(features)
            all_labels.append(type_name)

            # Progress indicator
            if (i + 1) % 2000 == 0:
                print(f"  ... {i + 1}/{samples_per_class}")

    # Build DataFrame
    feature_df = pd.DataFrame(all_features, columns=FEATURE_NAMES)
    feature_df['label'] = all_labels

    return feature_df


if __name__ == '__main__':
    print("Generating synthetic training data...")
    df = generate_training_data()
    print(f"Generated {len(df)} samples across {df['label'].nunique()} classes")
    print(f"Class distribution:\n{df['label'].value_counts()}")

    output_path = 'backend/app/training/synthetic_training_data.csv'
    df.to_csv(output_path, index=False)
    print(f"Saved to {output_path}")
