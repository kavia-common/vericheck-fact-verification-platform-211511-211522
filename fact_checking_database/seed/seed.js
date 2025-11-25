//
// MongoDB seed script for VeriCheck
//
// Usage:
//   MONGODB_URL='mongodb://appuser:dbuser123@localhost:5000/vericheck?authSource=admin' node seed.js
// or from repo root:
//   cd fact_checking_database/seed && node seed.js
//

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const DEFAULT_URL = 'mongodb://appuser:dbuser123@localhost:5000/vericheck?authSource=admin';

function getIndexesSpec() {
  const p = path.resolve(__dirname, '../schema/indexes.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function hashPassword(plain) {
  // NOTE: This is a placeholder for seed/demo. Backend should manage real hashing.
  // Store as a tagged value to avoid confusion.
  return `PLAINTEXT:${plain}`;
}

async function ensureIndexes(db, spec) {
  const tasks = [];
  for (const [coll, indexes] of Object.entries(spec)) {
    tasks.push((async () => {
      const collection = db.collection(coll);
      for (const idx of indexes) {
        const options = { ...idx };
        const key = options.key;
        delete options.key;
        await collection.createIndex(key, options);
      }
      console.log(`✓ Indexes ensured for ${coll}`);
    })());
  }
  await Promise.all(tasks);
}

async function seedAdminUser(db) {
  const users = db.collection('users');
  const email = 'admin@vericheck.local';
  const existing = await users.findOne({ email });
  if (existing) {
    console.log('ℹ Admin user already exists:', email);
    return existing._id;
  }
  const now = new Date();
  const res = await users.insertOne({
    email,
    password_hash: hashPassword('admin123'), // replace in production
    roles: ['admin'],
    created_at: now,
    last_login_at: null
  });
  console.log('✓ Admin user created:', email);
  return res.insertedId;
}

async function seedOptionalTestData(db, adminId) {
  const claims = db.collection('claims');
  const sources = db.collection('sources');
  const analyses = db.collection('analyses');

  const now = new Date();
  const claimDoc = {
    text: 'The Eiffel Tower is taller than 300 meters.',
    status: 'complete',
    user_id: adminId,
    created_at: now,
    updated_at: now
  };
  const { insertedId: claimId } = await claims.insertOne(claimDoc);

  await sources.insertMany([
    {
      claim_id: claimId,
      title: 'Eiffel Tower - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Eiffel_Tower',
      snippet: 'The Eiffel Tower is 330 metres tall...',
      reliability_score: 0.95,
      stance: 'support',
      provider: 'wikipedia',
      fetched_at: now
    },
    {
      claim_id: claimId,
      title: 'Example Blog',
      url: 'https://example.com/eiffel-tower',
      snippet: 'A blog post discussing Eiffel Tower height',
      reliability_score: 0.6,
      stance: 'neutral',
      provider: 'custom',
      fetched_at: now
    }
  ]);

  await analyses.insertOne({
    claim_id: claimId,
    summary: 'Multiple reputable sources confirm the Eiffel Tower exceeds 300 meters.',
    score: 0.92,
    created_at: now
  });

  console.log('✓ Optional test claim, sources, and analysis inserted.');
}

async function main() {
  const url = process.env.MONGODB_URL || DEFAULT_URL;
  const client = new MongoClient(url);
  try {
    await client.connect();
    const dbName = (new URL(url)).pathname.replace(/^\//, '') || 'vericheck';
    const db = client.db(dbName);
    console.log(`Connected to MongoDB, db=${db.databaseName}`);

    // Ensure indexes
    const indexesSpec = getIndexesSpec();
    await ensureIndexes(db, indexesSpec);

    // Seed admin user
    const adminId = await seedAdminUser(db);

    // Optional test data
    if ((process.env.SEED_TEST_DATA || 'true').toLowerCase() === 'true') {
      await seedOptionalTestData(db, adminId);
    }

    console.log('Seed completed.');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
