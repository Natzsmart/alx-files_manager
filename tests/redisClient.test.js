import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redisClient', () => {
  before((done) => {
    if (redisClient.isAlive()) {
      done();
    } else {
      redisClient.client.on('connect', done);
    }
  });

  it('should be an instance of RedisClient', () => {
    expect(redisClient.isAlive()).to.be.true;
  });

  it('should get a value from Redis', (done) => {
    redisClient.set('test_key', 'test_value', 10, (err, res) => {
      if (err) done(err);
      redisClient.get('test_key', (err, res) => {
        if (err) done(err);
        expect(res).to.equal('test_value');
        done();
      });
    });
  });

  after((done) => {
    redisClient.client.quit(done);
  });
});
