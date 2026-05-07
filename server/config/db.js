import mongoose from "mongoose";
import dotenv from "dotenv";
import Menu from "../models/Menu.js";

dotenv.config();

async function migrateLegacyMenuCategoriesOnce() {
  try {
    const [r1, r2] = await Promise.all([
      Menu.updateMany(
        { category: "Cold Dirinks" },
        { $set: { category: "Cold Drinks" } },
      ),
      Menu.updateMany({ category: "Othres" }, { $set: { category: "Others" } }),
    ]);
    if ((r1.modifiedCount ?? 0) || (r2.modifiedCount ?? 0)) {
      console.log(
        `Normalized menu categories (${r1.modifiedCount ?? 0} cold, ${r2.modifiedCount ?? 0} others)`,
      );
    }
  } catch (e) {
    console.warn("Legacy menu category migration skipped:", e.message);
  }
}

const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("DB connected successfully");
    await migrateLegacyMenuCategoriesOnce();
  } catch (error) {
    console.log("Failed to connect DB:", error.message);
    process.exit(1);
  }
};

export default connectToDB;