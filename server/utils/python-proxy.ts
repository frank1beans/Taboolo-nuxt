 
import type { H3Event } from 'h3';
import { createError, getRequestHeader, readMultipartFormData, setResponseStatus } from 'h3';

type FieldMapper = (name: string) => string;
type ValueMapper = (name: string, value: string, part: Record<string, unknown>) => string | Buffer;

interface ProxyOptions {
  method?: string;
  mapFieldName?: FieldMapper;
  mapFieldValue?: ValueMapper;
}

async function parseResponse(event: H3Event, res: Response, url: string) {
  const text = await res.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // leave as text
  }
  setResponseStatus(event, res.status, res.statusText);
  if (!res.ok) {
    if (process.env.NODE_ENV !== 'production' || res.status >= 500) {
      console.error('[python-proxy] Error from Python:', {
        url,
        status: res.status,
        statusText: res.statusText,
        payload,
      });
    }
    throw createError({
      statusCode: res.status,
      statusMessage: res.statusText,
      data: payload,
    });
  }
  return payload;
}

export async function proxyMultipartToPython(
  event: H3Event,
  targetPath: string,
  options?: ProxyOptions
) {
  const config = useRuntimeConfig();
  const baseUrl: string | undefined = config.pythonApiBaseUrl;
  const maxUploadMb = Number(config.pythonProxyMaxUploadMb ?? 100);
  const maxUploadBytes = Number.isFinite(maxUploadMb) ? maxUploadMb * 1024 * 1024 : 100 * 1024 * 1024;
  const timeoutMs = Number(config.pythonProxyTimeoutMs ?? 600000);
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'pythonApiBaseUrl non configurato' });
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const contentLength = Number(getRequestHeader(event, 'content-length') ?? 0);
  if (contentLength && contentLength > maxUploadBytes) {
    throw createError({ statusCode: 413, statusMessage: 'Upload troppo grande' });
  }

  const parts = await readMultipartFormData(event);
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: 'Corpo multipart mancante' });
  }

  let totalBytes = 0;
  const form = new FormData();
  for (const part of parts) {
    const originalName = part.name || 'file';
    const name = options?.mapFieldName ? options.mapFieldName(originalName) : originalName;
    totalBytes += part.data.length;
    if (totalBytes > maxUploadBytes) {
      throw createError({ statusCode: 413, statusMessage: 'Upload troppo grande' });
    }
    if (part.filename) {
      // Use Web Blob to keep undici fetch compatibility
      const blob = new Blob([part.data], { type: part.type || 'application/octet-stream' });
      form.append(name, blob, part.filename);
    } else {
      const raw = part.data.toString();
      const mapped = options?.mapFieldValue ? options.mapFieldValue(name, raw, part) : raw;
      form.append(name, mapped);
    }
  }

  const headers: Record<string, string> = {};
  const auth = getRequestHeader(event, 'authorization');
  if (auth) headers['authorization'] = auth;

  const url = `${normalizedBase}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
  const method = options?.method || event.node.req.method || 'POST';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'Python request timed out' });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  return parseResponse(event, res, url);
}
