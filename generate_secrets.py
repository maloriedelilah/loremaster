"""
Loremaster — Generate secrets for .env file.
Usage: python generate_secrets.py
"""

import random
import string


def generate_secret(length: int = 64) -> str:
    """Generate a strong random secret using OS-level entropy."""
    alphabet = string.ascii_letters + string.digits
    rng = random.SystemRandom()
    return "".join(rng.choice(alphabet) for _ in range(length))


def generate_password(length: int = 32) -> str:
    """Generate a strong random password using OS-level entropy."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    rng = random.SystemRandom()
    return "".join(rng.choice(alphabet) for _ in range(length))


if __name__ == "__main__":
    print("\nLoremaster — Generated Secrets")
    print("=" * 50)
    print("Copy these into your .env file.\n")

    print(f"POSTGRES_PASSWORD={generate_password()}")
    print(f"SECRET_KEY={generate_secret()}")
    print(f"SUPERADMIN_PASSWORD={generate_password()}")

    print("\n" + "=" * 50)
    print("Keep these safe — they won't be shown again.\n")