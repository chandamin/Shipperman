// import { MongoClient } from 'mongodb';
import { MongoClient } from "mongodb";

async function testConnection() {
  const uri = "mongodb+srv://admin:admin@database.gnxi7re.mongodb.net/?retryWrites=true&w=majority&appName=database";
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  } finally {
    await client.close();
  }
}

testConnection();
