from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['jobportal']
users = db['users']

# Delete existing admin user if any
result = users.delete_many({'email': 'admin'})
print(f"Deleted {result.deleted_count} existing admin user(s)")

# Pre-generated bcrypt hash for password "admin" using BCrypt with strength 10
# This hash was generated using Spring Security's BCryptPasswordEncoder
admin_password_hash = "$2a$10$N9qo8uLOickgx2ZrVzY6we4PY96Qb1TVizLQzpeCI4Kc4pqJhZgW6"

# Create admin user
admin_user = {
    'email': 'admin',
    'password': admin_password_hash,
    'firstName': 'Admin',
    'lastName': 'User',
    'role': 'ADMIN',
    'isPremium': True,
    'isLocked': False
}

result = users.insert_one(admin_user)
print(f"\n✅ Admin user created successfully!")
print(f"Email: admin")
print(f"Password: admin")
print(f"Role: ADMIN")
print(f"ID: {result.inserted_id}")

# Verify
user = users.find_one({'email': 'admin'}, {'password': 0})
print(f"\nVerification:")
print(f"User found: {user is not None}")
print(f"Role: {user['role'] if user else 'N/A'}")
print(f"Is Premium: {user.get('isPremium', False) if user else 'N/A'}")
print(f"Is Locked: {user.get('isLocked', False) if user else 'N/A'}")

client.close()

print("\n✅ You can now login with:")
print("   Username: admin")
print("   Password: admin")
