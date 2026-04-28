export async function readApiJson<T = any>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  const returnedHtml = /^\s*(<!doctype html|<html)/i.test(text);
  const htmlMessage = 'API-ruten svarte med HTML i stedet for JSON. Sjekk at backend-ruten er konfigurert.';

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || (returnedHtml ? htmlMessage : fallbackMessage));
  }

  if (returnedHtml) {
    throw new Error(htmlMessage);
  }

  return (payload ?? {}) as T;
}
