import { type ProblemDetails, problemDetailsSchema } from "@shop/contracts";

export async function parseProblemDetails(
  response: Response,
): Promise<ProblemDetails | null> {
  try {
    const payload = await response.json();
    return problemDetailsSchema.parse(payload);
  } catch {
    return null;
  }
}

export function getDisplayErrorMessage(problem: ProblemDetails | null): string {
  if (!problem) {
    return "An unexpected error occurred. Please try again.";
  }

  return `${problem.title}: ${problem.detail}`;
}
