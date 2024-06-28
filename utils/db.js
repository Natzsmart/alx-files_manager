// utils/db.js

import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.client.connect().then(() => {
      this.db = this.client.db(database);
    }).catch((err) => {
      console.error('Failed to connect to MongoDB:', err);
    });
  }

  async isAlive() {
    try {
        return await this.client.isConnected();
    } catch (error) {
        console.error('Error checking MongoDB connection:', error);
        return false;
    }
    }

    async nbUsers() {
        try {
            const db = this.client.db();
            const usersCollection = db.collection('users');
            return await usersCollection.countDocuments();
        } catch (error) {
            console.error('Error counting users:', error);
            throw error;
        }
    }


    async nbFiles() {
        try {
            const db = this.client.db();
            const filesCollection = db.collection('files');
            return await filesCollection.countDocuments();
        } catch (error) {
            console.error('Error counting files:', error);
            throw error;
        }
    }
}

const dbClient = new DBClient();
export default dbClient;
