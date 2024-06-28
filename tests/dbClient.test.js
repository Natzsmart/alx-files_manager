import { expect } from 'chai';
import dbClient from '../utils/db';

describe('dbClient', () => {
  before(async () => {
    await dbClient.client.connect();
  });

  it('should be connected to the database', async () => {
    const isAlive = await dbClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it('should have a users collection', async () => {
    const usersCount = await dbClient.nbUsers();
    expect(usersCount).to.be.a('number');
  });

  it('should have a files collection', async () => {
    const filesCount = await dbClient.nbFiles();
    expect(filesCount).to.be.a('number');
  });

  after(async () => {
    await dbClient.client.close();
  });
});
