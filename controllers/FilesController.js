import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import { ObjectId } from 'mongodb';
import Queue from 'bull';


const fileQueue = new Queue('fileQueue');
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const tokenKey = `auth_${token}`;

    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.filesCollection.findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : new ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await dbClient.filesCollection.insertOne(fileData);
      return res.status(201).json({ id: result.insertedId, ...fileData });
    }

    if (type === 'image') {
        await fileQueue.add({ userId, fileId: file._id });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    fs.mkdirSync(FOLDER_PATH, { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

    fileData.localPath = localPath;

    const result = await dbClient.filesCollection.insertOne(fileData);
    return res.status(201).json({ id: result.insertedId, ...fileData });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const tokenKey = `auth_${token}`;

    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const tokenKey = `auth_${token}`;

    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const skip = page * pageSize;

    const files = await dbClient.filesCollection.aggregate([
      { $match: { userId: new ObjectId(userId), parentId: parentId === '0' ? '0' : new ObjectId(parentId) } },
      { $skip: skip },
      { $limit: pageSize }
    ]).toArray();

    return res.json(files);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const tokenKey = `auth_${token}`;

    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.filesCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: true } });
    const updatedFile = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId) });

    return res.status(200).json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const tokenKey = `auth_${token}`;

    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.filesCollection.updateOne({ _id: new ObjectId(fileId) }, { $set: { isPublic: false } });
    const updatedFile = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId) });

    return res.status(200).json(updatedFile);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const size = req.query.size;
    const file = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic) {
      const token = req.header('X-Token');
      const tokenKey = `auth_${token}`;

      const userId = await redisClient.get(tokenKey);
      if (!userId || userId.toString() !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = path.join(FOLDER_PATH, file.localPath);
    if (size) {
      filePath = `${filePath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const fileContent = fs.readFileSync(filePath);
    const mimeType = mime.lookup(file.name);

    res.setHeader('Content-Type', mimeType);
    return res.status(200).send(fileContent);
  }
}

export default FilesController;
