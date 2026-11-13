import { ClientResponseError } from "pocketbase";

type FieldError = {
  code?: string;
  message?: string;
};

type ErrorResponse = {
  data?: Record<string, FieldError | undefined>;
};

export function getFieldError(error: unknown, field: string): FieldError | undefined {
  if (!(error instanceof ClientResponseError)) return undefined;
  return (error.response as ErrorResponse).data?.[field];
}
