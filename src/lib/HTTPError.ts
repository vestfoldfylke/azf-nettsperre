import type { HttpResponseInit } from "@azure/functions";

export class HTTPError extends Error {
  public readonly status: number;
  public readonly body: string;
  public readonly data: unknown;

  /**
   *
   * @param status - HTTP status code
   * @param message - Error message
   * @param [data] - Optional additional data (object or stringified JSON)
   */
  constructor(status: number, message: string, data: unknown = null) {
    super(message);

    this.status = status;
    this.body = message;
    this.data = data;
    this.name = "HTTPError";
  }

  getBody(): unknown {
    try {
      return JSON.parse(this.body);
    } catch {
      return this.body;
    }
  }

  getData(): unknown {
    if (!this.data) {
      return null;
    }

    if (typeof this.data !== "string") {
      return this.data;
    }

    try {
      return JSON.parse(this.data);
    } catch {
      return this.data;
    }
  }

  getJsonBody(includeData: boolean = false): Record<string, unknown> {
    if (includeData && this.data) {
      return {
        body: this.getBody(),
        data: this.getData()
      };
    }

    return {
      body: this.getBody()
    };
  }

  toResponse(includeData: boolean = false): HttpResponseInit {
    return {
      headers: { "Content-Type": "application/json" },
      status: this.status,
      jsonBody: this.getJsonBody(includeData)
    };
  }
}
