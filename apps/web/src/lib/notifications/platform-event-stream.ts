import { getAccessToken, refreshAccessToken } from "@/lib/auth/auth-client";
import { resolveApiUrl } from "@/lib/auth/resolve-api-url";

type PlatformEventStreamOptions = {
  onClose?: () => void;
  onEvent: (eventName: string, payload: unknown) => void;
  onError?: (error: unknown) => void;
  onOpen?: () => void;
};

export async function openPlatformEventStream(
  options: PlatformEventStreamOptions,
): Promise<() => void> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return () => {};
  }

  const controller = new AbortController();

  try {
    const response = await fetch(resolveApiUrl("/api/events/stream"), {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    if (response.status === 401) {
      const session = await refreshAccessToken();
      if (!session) {
        return () => {};
      }

      return openPlatformEventStream(options);
    }

    if (!response.ok || !response.body) {
      throw new Error(
        `Platform event stream failed with status ${response.status}.`,
      );
    }

    options.onOpen?.();

    void consumeEventStream(response.body, options);
  } catch (error) {
    controller.abort();
    throw error;
  }

  return () => {
    controller.abort();
  };
}

async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  options: PlatformEventStreamOptions,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const parsed = parseSseFrame(frame);
        if (!parsed) {
          continue;
        }

        options.onEvent(parsed.eventName, parsed.payload);
      }
    }
  } catch (error) {
    options.onError?.(error);
  } finally {
    reader.releaseLock();
    options.onClose?.();
  }
}

function parseSseFrame(frame: string) {
  const lines = frame
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith(":"));

  if (!lines.length) {
    return null;
  }

  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    eventName,
    payload: JSON.parse(dataLines.join("\n")) as unknown,
  };
}
