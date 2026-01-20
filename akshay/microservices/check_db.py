from pymongo import MongoClient
import json

client = MongoClient('mongodb://localhost:27017/')
db = client['authdb']
users = list(db.users.find({}, {'_id': 0, 'password': 0}))
print(json.dumps(users, indent=2))
client.close()
