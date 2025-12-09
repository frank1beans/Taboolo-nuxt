import { createError, getRequestHeader, readMultipartFormData, setResponseStatus } from 'h3';

type FieldMapper = (name: string) => string;
type ValueMapper = (name: string, value: string, part: any) => string | Blob | Buffer;

interface ProxyOptions {
  method?: string;
  mapFieldName?: FieldMapper;
  mapFieldValue?: ValueMapper;
}

async function parseResponse(event: any, res: Response) {
  const text = await res.text();
  let payload: any = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // leave as text
  }
  setResponseStatus(event, res.status, res.statusText);
  if (!res.ok) {
    throw createError({
      statusCode: res.status,
      statusMessage: res.statusText,
      data: payload,
    });
  }
  return payload;
}

export async function proxyMultipartToPython(
  event: any,
  targetPath: string,
  options?: ProxyOptions
) {
  const config = useRuntimeConfig();
  const baseUrl: string | undefined = config.pythonApiBaseUrl;
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'pythonApiBaseUrl non configurato' });
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  const parts = await readMultipartFormData(event);
  if (!parts) {
    throw createError({ statusCode: 400, statusMessage: 'Corpo multipart mancante' });
  }

  const form = new FormData();
  for (const part of parts) {
    const originalName = part.name || 'file';
    const name = options?.mapFieldName ? options.mapFieldName(originalName) : originalName;
    if (part.filename) {
      form.append(name, new Blob([part.data]), part.filename);
    } else {
      const raw = part.data.toString();
      const mapped = options?.mapFieldValue ? options.mapFieldValue(name, raw, part) : raw;
      if (mapped instanceof Blob) {
        form.append(name, mapped);
      } else if (mapped instanceof Buffer) {
        form.append(name, new Blob([mapped]));
      } else {
        form.append(name, mapped);
      }
    }
  }

  const headers: Record<string, string> = {};
  const auth = getRequestHeader(event, 'authorization');
  if (auth) headers['authorization'] = auth;

  const url = `${normalizedBase}${targetPath.startsWith('/') ? '' : '/'}${targetPath}`;
  const method = options?.method || event.node.req.method || 'POST';

  const res = await fetch(url, {
    method,
    headers,
    body: form,
  });

  return parseResponse(event, res);
}
