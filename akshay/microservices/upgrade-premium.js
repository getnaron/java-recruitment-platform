const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function upgradeToPremium() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const database = client.db('jobportal');
        const users = database.collection('users');

        const result = await users.updateOne(
            { email: 'diya@gmail.com' },
            { $set: { isPremium: true } }
        );

        console.log(`Matched ${result.matchedCount} document(s)`);
        console.log(`Modified ${result.modifiedCount} document(s)`);

        // Verify the update
        const user = await users.findOne(
            { email: 'diya@gmail.com' },
            { projection: { email: 1, role: 1, isPremium: 1, firstName: 1, lastName: 1 } }
        );

        console.log('\nUpdated user:');
        console.log(JSON.stringify(user, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

upgradeToPremium();
