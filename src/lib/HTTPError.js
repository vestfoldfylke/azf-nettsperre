class HTTPError extends Error {
  status;
  body;
  data;

  /**
   *
   * @param status - HTTP status code
   * @param message - Error message
   * @param [data] - Optional additional data (stringified JSON)
   */
  constructor(status, message, data = undefined) {
    super(message);

    this.status = status;
    this.body = message;
    this.data = data;
    this.name = "HTTPError";
  }

  getBody() {
    try {
      return JSON.parse(this.body);
    } catch {
      return this.body;
    }
  }

  getData() {
    if (!this.data) {
      return undefined;
    }

    try {
      return JSON.parse(this.data);
    } catch {
      return this.data;
    }
  }

  getJsonBody(includeData = false) {
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

  toResponse(includeData = false) {
    return {
      headers: { "Content-Type": "application/json" },
      status: this.status,
      jsonBody: this.getJsonBody(includeData)
    };
  }
}

module.exports = HTTPError;
