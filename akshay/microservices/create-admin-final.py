from pymongo import MongoClient
import bcrypt

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['jobportal']
users = db['users']

# Delete existing admin user if any
users.delete_many({'email': 'admin'})

# Generate bcrypt hash for password "admin"
password = "admin"
salt = bcrypt.gensalt(rounds=10)
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

# Create admin user
admin_user = {
    'email': 'admin',
    'password': hashed.decode('utf-8'),
    'firstName': 'Admin',
    'lastName': 'User',
    'role': 'ADMIN',
    'isPremium': True,
    'isLocked': False
}

result = users.insert_one(admin_user)
print(f"✅ Admin user created successfully!")
print(f"Email: admin")
print(f"Password: admin")
print(f"ID: {result.inserted_id}")
print(f"Password hash: {hashed.decode('utf-8')[:30]}...")

# Verify
user = users.find_one({'email': 'admin'}, {'password': 0})
print(f"\nVerification:")
print(f"User found: {user is not None}")
print(f"Role: {user['role'] if user else 'N/A'}")

client.close()
