import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const environment = process.env.NODE_ENV || "development";
    const dbName = conn.connection.name;

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${dbName}`);
    console.log(`Environment: ${environment}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    // Different retry strategy based on environment
    const retryDelay = process.env.NODE_ENV === "production" ? 5000 : 3000;
    console.log(`Retrying connection in ${retryDelay / 1000} seconds...`);
    setTimeout(connectDB, retryDelay);
  }
};

export default connectDB;
