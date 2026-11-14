
from config import get_db_connection
from werkzeug.security import generate_password_hash

# Admin credentials
username = "admin"
password = "Admin@123"

# Generate secure password hash
hashed_password = generate_password_hash(password)

connection = None

try:
    connection = get_db_connection()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            INSERT INTO users (username, password)
            VALUES (%s, %s)
            """,
            (username, hashed_password)
        )

    connection.commit()

    print("Admin account created successfully!")

except Exception as e:
    if connection:
        connection.rollback()

    print("Error:", e)

finally:
    if connection:
        connection.close()
