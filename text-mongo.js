import { MongoClient } from "mongodb";

async function testConnection() {
  const uri = "mongodb+srv://shopify-app:Zukssm5f8Z7pu9Ov@ship.4tjmq.mongodb.net/?retryWrites=true&w=majority&appName=ship";
  
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB client
    await client.connect();
    console.log("Connected successfully to MongoDB");

    // Get the correct database and collection
    const db = client.db('shopAuth'); // Correct database name
    const collection = db.collection('ShopTokens'); // Correct collection name

    // Insert some sample data into the collection
    const tempData = [
      { name: 'Product 1', price: 25, stock: 100 }
    ];

    const result = await collection.insertMany(tempData);
    console.log(`${result.insertedCount} documents were inserted into the collection`);

  } catch (err) {
    console.error("MongoDB connection error:", err);
  } finally {
    // Close the client connection
    await client.close();
  }
}

testConnection();
