import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import express from 'express';
import request from 'supertest';
import { validate } from '../validate';

const app = express();
app.use(express.json());

const bodySchema = z.object({
  name: z.string().min(1),
  age: z.number().min(0),
});

const querySchema = z.object({
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

app.post('/test-body', validate(bodySchema, 'body'), (req, res) => {
  res.json({ success: true, data: req.body });
});

app.get('/test-query', validate(querySchema, 'query'), (req, res) => {
  res.json({ success: true, data: req.query });
});

app.get('/test-params/:id', validate(paramsSchema, 'params'), (req, res) => {
  res.json({ success: true, data: req.params });
});

describe('validate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes valid body data', async () => {
    const res = await request(app)
      .post('/test-body')
      .send({ name: 'Emma', age: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Emma');
  });

  it('returns 400 with details for invalid body', async () => {
    const res = await request(app)
      .post('/test-body')
      .send({ name: '', age: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThan(0);
    expect(res.body.details[0]).toHaveProperty('path');
    expect(res.body.details[0]).toHaveProperty('message');
  });

  it('validates query parameters', async () => {
    const res = await request(app)
      .get('/test-query?page=abc&limit=0');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('validates params', async () => {
    const res = await request(app)
      .get('/test-params/not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toBeInstanceOf(Array);
  });
});
