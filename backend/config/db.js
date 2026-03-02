const mongoose = require('mongoose');

// Use a global variable to persist the connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    // 1. If we already have a connection, return it
    if (cached.conn) {
        return cached.conn;
    }

    // 2. Check if the default connection is already established
    if (mongoose.connection.readyState === 1) {
        cached.conn = mongoose;
        return cached.conn;
    }

    // 3. If we don't have a promise, create one
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 1, // Minimize connections as requested
            minPoolSize: 1,
            socketTimeoutMS: 30000,
            serverSelectionTimeoutMS: 5000,
        };

        console.log('🔄 Connecting to MongoDB (Single Connection Mode)...');
        cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
            console.log('✅ MongoDB Connected');
            return m;
        });
    }

    // 4. Wait for the promise and return the connection
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

