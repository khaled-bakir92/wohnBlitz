from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from core.security import verify_token
from database.database import get_db
from models.user import User

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    email = verify_token(token)

    print(f"Getting user for email: {email}")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"User not found for email: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    print(
        f"Found user: {
            user.email}, is_admin: {
            user.is_admin}, type: {
            type(
                user.is_admin)}"
    )
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    print(f"Admin check for user: {current_user.email}")
    print(f"User is_admin value: {current_user.is_admin}")
    print(f"User is_admin type: {type(current_user.is_admin)}")

    # Convert to boolean explicitly
    is_admin = bool(current_user.is_admin) and current_user.is_admin != 0
    print(f"Converted is_admin: {is_admin}")

    if not is_admin:
        print(f"ADMIN ACCESS DENIED for {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )

    print(f"ADMIN ACCESS GRANTED for {current_user.email}")
    return current_user


def get_current_user_with_profile(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Requires user to have completed their profile"""
    if not current_user.profile_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile must be completed to access this resource. Please complete your Bewerbungsprofil first."
        )
    return current_user
