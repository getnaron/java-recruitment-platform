from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['jobportal']
users = db['users']

# Update the user
result = users.update_one(
    {'email': 'diya@gmail.com'},
    {'$set': {'isPremium': True}}
)

print(f"Matched {result.matched_count} document(s)")
print(f"Modified {result.modified_count} document(s)")

# Verify the update
user = users.find_one(
    {'email': 'diya@gmail.com'},
    {'email': 1, 'role': 1, 'isPremium': 1, 'firstName': 1, 'lastName': 1}
)

print("\nUpdated user:")
print(user)

client.close()
