
from config import get_db_connection

try:
    connection = get_db_connection()

    print("Database connected successfully!")

    cursor = connection.cursor()

    cursor.execute("SELECT VERSION()")

    result = cursor.fetchone()

    print("MariaDB Version:", result)

    cursor.close()
    connection.close()

except Exception as e:
    print("Database connection failed:", e)
