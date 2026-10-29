export type ErrorCode = "card_not_found" | "invalid_request" | "not_found" | "internal_error";

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export function errorBody({ code, message }: ErrorBody["error"]): ErrorBody {
  return { error: { code, message } };
}
