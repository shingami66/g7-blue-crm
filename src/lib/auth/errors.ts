export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class AuthDependencyError extends Error {
  constructor(message = "Authentication or user data service is unavailable") {
    super(message);
    this.name = "AuthDependencyError";
  }
}
