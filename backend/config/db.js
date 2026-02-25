const mongoose = require('mongoose');

// Use a global variable to persist the connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    // 1. If we already have a connection, return it
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    // 2. If we don't have a promise, create one
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 5000,
        };

        console.log('🔄 Connecting to MongoDB...');
        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
            console.log('✅ MongoDB Connected');
            return m;
        });
    }

    // 3. Wait for the promise and return the connection
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null; // Reset promise on error so we can retry
        console.error('❌ MongoDB Connection Error:', e.message);
        throw e;
    }

    return cached.conn;
}

module.exports = dbConnect;
