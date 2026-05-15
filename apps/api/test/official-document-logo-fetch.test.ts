import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import test from "node:test";
import {
  fetchOfficialDocumentLogoImage,
  isSafeLogoImageUrlForFetch,
  requestOfficialDocumentLogoImage,
} from "../src/modules/official-documents/official-document-logo-fetch.js";

test("rejects loopback, private, and metadata logo URLs before fetch", async () => {
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://localhost/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://127.0.0.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://10.0.0.5/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://169.254.169.254/latest/meta-data"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://192.0.2.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://198.51.100.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://203.0.113.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://192.31.196.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://192.52.193.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://192.175.48.1/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[fd00::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[fec0::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[::7f00:1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[::ffff:127.0.0.1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[::ffff:93.184.216.34]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[64:ff9b::7f00:1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[64:ff9b:1::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[2001:2::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[2001:3::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[2001:4:112::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[2001:10::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[2001:20::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[3fff::1]/logo.png"),
    false,
  );
  assert.equal(
    await isSafeLogoImageUrlForFetch("http://[5f00::1]/logo.png"),
    false,
  );
});

test("allows public http image hosts", async () => {
  assert.equal(
    await isSafeLogoImageUrlForFetch("https://93.184.216.34/document-logo.png"),
    true,
  );
});

test("does not request blocked logo URLs", async () => {
  let requestCount = 0;
  const image = await fetchOfficialDocumentLogoImage(
    "http://127.0.0.1/document-logo.png",
    {
      async requestImage() {
        requestCount += 1;
        return Buffer.from("not used");
      },
    },
  );

  assert.equal(image, null);
  assert.equal(requestCount, 0);
});

test("pins requests to the validated DNS result", async () => {
  let lookupCount = 0;
  const image = await fetchOfficialDocumentLogoImage(
    "https://cdn.example.test/document-logo.png",
    {
      async lookupHost() {
        lookupCount += 1;
        return lookupCount === 1
          ? [{ address: "93.184.216.34", family: 4 }]
          : [{ address: "169.254.169.254", family: 4 }];
      },
      async requestImage(target) {
        assert.equal(target.address, "93.184.216.34");
        return onePixelPng();
      },
    },
  );

  assert.deepEqual(image, onePixelPng());
  assert.equal(lookupCount, 1);
});

test("rejects private DNS answers before requesting the logo", async () => {
  let requestCount = 0;
  const image = await fetchOfficialDocumentLogoImage(
    "https://cdn.example.test/document-logo.png",
    {
      async lookupHost() {
        return [{ address: "10.0.0.5", family: 4 }];
      },
      async requestImage() {
        requestCount += 1;
        return onePixelPng();
      },
    },
  );

  assert.equal(image, null);
  assert.equal(requestCount, 0);
});

test("rejects mixed public and private DNS answers before requesting the logo", async () => {
  let requestCount = 0;
  const image = await fetchOfficialDocumentLogoImage(
    "https://cdn.example.test/document-logo.png",
    {
      async lookupHost() {
        return [
          { address: "93.184.216.34", family: 4 },
          { address: "169.254.169.254", family: 4 },
        ];
      },
      async requestImage() {
        requestCount += 1;
        return onePixelPng();
      },
    },
  );

  assert.equal(image, null);
  assert.equal(requestCount, 0);
});

test("does not follow redirects to private network targets", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(302, {
      location: "http://169.254.169.254/latest/meta-data",
    });
    response.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  if (typeof address !== "object" || address === null) {
    throw new Error("Expected server address info.");
  }

  try {
    const image = await requestOfficialDocumentLogoImage({
      address: "127.0.0.1",
      family: 4,
      hostname: "public.example.test",
      url: new URL(`http://public.example.test:${address.port}/logo.png`),
    });

    assert.equal(image, null);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("rejects oversized logo content length before reading the body", async () => {
  await withLogoServer(
    (_request, response) => {
      response.writeHead(200, {
        "content-length": "2000001",
        "content-type": "image/png",
      });
      response.end(onePixelPng());
    },
    async (url) => {
      assert.equal(await requestPinnedTestImage(url), null);
    },
  );
});

test("rejects oversized streamed logo bodies", async () => {
  await withLogoServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(Buffer.alloc(2_000_001));
    },
    async (url) => {
      assert.equal(await requestPinnedTestImage(url), null);
    },
  );
});

test("rejects non-image logo responses", async () => {
  await withLogoServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<svg></svg>");
    },
    async (url) => {
      assert.equal(await requestPinnedTestImage(url), null);
    },
  );
});

test("rejects spoofed image content types with non-image bytes", async () => {
  await withLogoServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "image/png" });
      response.end("<svg></svg>");
    },
    async (url) => {
      assert.equal(await requestPinnedTestImage(url), null);
    },
  );
});

test("requests image data using the pinned address", async () => {
  const logo = onePixelPng();
  await withLogoServer(
    (_request, response) => {
      response.writeHead(200, {
        "content-length": String(logo.byteLength),
        "content-type": "image/png",
      });
      response.end(logo);
    },
    async (url) => {
      assert.deepEqual(await requestPinnedTestImage(url), logo);
    },
  );
});

test("stops slow-drip logo responses at the wall-clock deadline", async () => {
  await withLogoServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "image/png" });
      response.write(onePixelPng().subarray(0, 8));
      setTimeout(() => response.end(onePixelPng().subarray(8)), 6_000);
    },
    async (url) => {
      assert.equal(await requestPinnedTestImage(url), null);
    },
  );
});

async function withLogoServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  run: (url: URL) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  if (typeof address !== "object" || address === null) {
    throw new Error("Expected server address info.");
  }

  try {
    await run(new URL(`http://public.example.test:${address.port}/logo.png`));
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function requestPinnedTestImage(url: URL): Promise<Buffer | null> {
  return requestOfficialDocumentLogoImage({
    address: "127.0.0.1",
    family: 4,
    hostname: "public.example.test",
    url,
  });
}

function onePixelPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
}
