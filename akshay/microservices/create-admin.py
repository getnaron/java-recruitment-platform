from pymongo import MongoClient
from datetime import datetime
import bcrypt

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['jobportal']
users = db['users']

# Hash the password "admin"
password = "admin"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Create admin user
admin_user = {
    'email': 'admin',
    'password': hashed.decode('utf-8'),
    'firstName': 'Admin',
    'lastName': 'User',
    'role': 'ADMIN',
    'createdAt': datetime.now(),
    'isPremium': True,
    'isLocked': False
}

# Check if admin already exists
existing = users.find_one({'email': 'admin'})
if existing:
    print("Admin user already exists!")
    print(f"Email: {existing['email']}")
    print(f"Role: {existing['role']}")
else:
    result = users.insert_one(admin_user)
    print(f"✅ Admin user created successfully!")
    print(f"Email: admin")
    print(f"Password: admin")
    print(f"Role: ADMIN")
    print(f"ID: {result.inserted_id}")

client.close()
