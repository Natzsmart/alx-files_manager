import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.filesCollection.findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const filePath = path.join(FOLDER_PATH, file.localPath);

  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  try {
    const sizes = [500, 250, 100];
    for (const size of sizes) {
      const options = { width: size };
      const thumbnail = await imageThumbnail(filePath, options);
      const thumbnailPath = `${filePath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
    }
    done();
  } catch (error) {
    done(error);
  }
});
