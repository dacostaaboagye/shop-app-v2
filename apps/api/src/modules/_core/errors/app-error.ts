import type { ErrorCode } from "@shop/contracts";

type AppErrorInput = {
  code: ErrorCode;
  statusCode: number;
  title: string;
  detail: string;
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly title: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(input: AppErrorInput) {
    super(input.detail);
    this.name = "AppError";
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.title = input.title;
    this.details = input.details;
  }
}
