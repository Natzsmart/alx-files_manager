import dbClient from "../utils/db";
import redisClient from "../utils/redis";

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    const user = await dbClient.usersCollection.findOne({ email });

    if (user) {
      return res.status(400).json({ error: "Already exist" });
    }

    const hashedPassword = sha1(password);

    const result = await dbClient.usersCollection.insertOne({
      email,
      password: hashedPassword,
    });

    const userId = result.insertedId;

    await userQueue.add("sendWelcomeEmail", { userId });

    return res.status(201).json({ id: userId, email });
  }

  static async getMe(req, res) {
    const token = req.header("X-Token");
    const tokenKey = `auth_${token}`;

    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await dbClient.usersCollection.findOne({
      _id: new ObjectId(userId),
    });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

export default UsersController;
