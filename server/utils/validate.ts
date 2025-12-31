import type { H3Event } from 'h3';
import { createError, getQuery, getRouterParam } from 'h3';
import { Types } from 'mongoose';

const normalizeValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value[0];
  if (value === null || value === undefined) return undefined;
  return String(value);
};

export const requireObjectId = (value: unknown, label: string): string => {
  const text = normalizeValue(value);
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: `${label} required` });
  }
  if (!Types.ObjectId.isValid(text)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label}` });
  }
  return text;
};

export const requireObjectIdParam = (event: H3Event, param: string, label: string): string => {
  return requireObjectId(getRouterParam(event, param), label);
};

export const requireObjectIdQuery = (event: H3Event, key: string, label: string): string => {
  const query = getQuery(event) as Record<string, unknown>;
  return requireObjectId(query[key], label);
};

export const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);
