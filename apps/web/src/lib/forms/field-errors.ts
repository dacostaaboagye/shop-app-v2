export function getFormFieldMessages(
  errors: ReadonlyArray<unknown> | null | undefined,
): string[] {
  if (!errors?.length) {
    return [];
  }

  return [
    ...new Set(
      errors
        .map(getFormFieldMessage)
        .filter((message): message is string => message !== null),
    ),
  ];
}

function getFormFieldMessage(error: unknown): string | null {
  if (typeof error === "string") {
    const message = error.trim();
    return message.length ? message : null;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length ? message : null;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.trim();
    return message.length ? message : null;
  }

  return null;
}
