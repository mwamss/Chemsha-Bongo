import hmac
import hashlib
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Tuple
from jose import JWTError, jwt
import bcrypt

from backend.app.core.config import settings

# --- Password Hashing (Bcrypt) ---

_PASSWORD_HASH_PREFIX = "bcrypt-sha256$"


def _password_digest(password: str) -> bytes:
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("ascii")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        if hashed_password.startswith(_PASSWORD_HASH_PREFIX):
            bcrypt_hash = hashed_password[len(_PASSWORD_HASH_PREFIX):]
            return bcrypt.checkpw(_password_digest(plain_password), bcrypt_hash.encode("utf-8"))
        # Backward compatibility with existing direct-bcrypt hashes.
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash arbitrary-length UTF-8 passwords with SHA-256 prehashing and bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return _PASSWORD_HASH_PREFIX + bcrypt.hashpw(_password_digest(password), salt).decode("utf-8")


# --- JWT Session Token ---

def create_access_token(
    subject: Union[str, int],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT access token for authentication."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.now(timezone.utc),
        "iss": "chemsha-bongo-auth"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[str]:
    """Decode and validate a JWT access token, returning the subject (user_id)."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        return user_id
    except JWTError:
        return None


# --- CSRF Protection for Cookie Authentication ---

def generate_csrf_token(user_id: str) -> str:
    """
    Generate a cryptographically signed Double Submit CSRF token bound to the user session.
    Format: <timestamp>:<nonce>:<signature>
    """
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))
    nonce = secrets.token_hex(16)
    message = f"{user_id}:{timestamp}:{nonce}".encode("utf-8")
    signature = hmac.new(
        settings.CSRF_SECRET.encode("utf-8"),
        message,
        hashlib.sha256
    ).hexdigest()
    return f"{timestamp}:{nonce}:{signature}"


def validate_csrf_token(token: str, user_id: str, max_age_seconds: int = 86400) -> bool:
    """Validate that the incoming CSRF token is valid, unexpired, and signed for this user."""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return False
        timestamp_str, nonce, signature = parts
        timestamp = int(timestamp_str)
        now = int(datetime.now(timezone.utc).timestamp())
        
        # Check expiration
        if now - timestamp > max_age_seconds or timestamp > now + 300:
            return False
            
        # Re-compute expected signature
        message = f"{user_id}:{timestamp_str}:{nonce}".encode("utf-8")
        expected_sig = hmac.new(
            settings.CSRF_SECRET.encode("utf-8"),
            message,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False

