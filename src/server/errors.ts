export type FieldErrors = Record<string, string[]>;

/** Expected, user-facing failure from a service (validation, conflict, bad credentials...). */
export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Thrown by the policy layer when an actor is not permitted to perform an action (NFREQ4). */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
