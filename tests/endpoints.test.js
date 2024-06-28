import { expect } from 'chai';
import request from 'supertest';
import app from '../server'; // Make sure to adjust the path if necessary

describe('Endpoints', () => {
  let token;
  let userId;
  let fileId;

  before(async () => {
    await request(app)
      .post('/users')
      .send({ email: 'test@example.com', password: '1234' });

    const res = await request(app)
      .get('/connect')
      .auth('test@example.com', '1234');

    token = res.body.token;

    const meRes = await request(app)
      .get('/users/me')
      .set('X-Token', token);
    userId = meRes.body.id;
  });

  after(async () => {
    await request(app)
      .get('/disconnect')
      .set('X-Token', token);
  });

  it('GET /status', async () => {
    const res = await request(app).get('/status');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('redis');
    expect(res.body).to.have.property('db');
  });

  it('GET /stats', async () => {
    const res = await request(app).get('/stats');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('users');
    expect(res.body).to.have.property('files');
  });

  it('POST /users', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'newuser@example.com', password: '1234' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('email');
  });

  it('GET /connect', async () => {
    const res = await request(app)
      .get('/connect')
      .auth('newuser@example.com', '1234');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
  });

  it('GET /disconnect', async () => {
    const res = await request(app)
      .get('/disconnect')
      .set('X-Token', token);
    expect(res.status).to.equal(204);
  });

  it('GET /users/me', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('X-Token', token);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('email');
  });

  it('POST /files', async () => {
    const res = await request(app)
      .post('/files')
      .set('X-Token', token)
      .send({
        name: 'test.txt',
        type: 'file',
        data: 'SGVsbG8gd29ybGQh',
        parentId: 0,
        isPublic: false,
      });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('userId');
    fileId = res.body.id;
  });

  it('GET /files/:id', async () => {
    const res = await request(app)
      .get(`/files/${fileId}`)
      .set('X-Token', token);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('id');
    expect(res.body).to.have.property('userId');
  });

  it('GET /files', async () => {
    const res = await request(app)
      .get('/files')
      .set('X-Token', token);
    expect(res.status).to.equal(200);
    expect(Array.isArray(res.body)).to.be.true;
  });

  it('PUT /files/:id/publish', async () => {
    const res = await request(app)
      .put(`/files/${fileId}/publish`)
      .set('X-Token', token);
    expect(res.status).to.equal(200);
    expect(res.body.isPublic).to.be.true;
  });

  it('PUT /files/:id/unpublish', async () => {
    const res = await request(app)
      .put(`/files/${fileId}/unpublish`)
      .set('X-Token', token);
    expect(res.status).to.equal(200);
    expect(res.body.isPublic).to.be.false;
  });

  it('GET /files/:id/data', async () => {
    const res = await request(app)
      .get(`/files/${fileId}/data`)
      .set('X-Token', token);
    expect(res.status).to.equal(200);
    expect(res.text).to.equal('Hello world!');
  });

  it('GET /files/:id/data with size', async () => {
    const sizes = [100, 250, 500];
    for (const size of sizes) {
      const res = await request(app)
        .get(`/files/${fileId}/data?size=${size}`)
        .set('X-Token', token);
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/image/);
    }
  });
});
