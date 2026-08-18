export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message);
}

export function serviceUnavailable(message: string): HttpError {
  return new HttpError(503, message);
}
