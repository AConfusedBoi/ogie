import { describe, expect, it } from "bun:test";

import { extractFromHtml, type ExtractSuccess } from "../src";
import { fixtures } from "./data";

describe("extractFromHtml - App Links basic", () => {
  const result = extractFromHtml(fixtures.appLinks, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("succeeds", () => {
    expect(result.success).toBe(true);
  });

  it("returns arrays for platforms", () => {
    expect(Array.isArray(result.data.appLinks?.ios)).toBe(true);
    expect(Array.isArray(result.data.appLinks?.android)).toBe(true);
    expect(Array.isArray(result.data.appLinks?.web)).toBe(true);
  });
});

describe("extractFromHtml - App Links iOS", () => {
  const result = extractFromHtml(fixtures.appLinks, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts al:ios:url", () => {
    expect(result.data.appLinks?.ios?.[0]?.url).toBe("myapp://content/123");
  });

  it("extracts al:ios:app_store_id", () => {
    expect(result.data.appLinks?.ios?.[0]?.appStoreId).toBe("123456789");
  });

  it("extracts al:ios:app_name", () => {
    expect(result.data.appLinks?.ios?.[0]?.appName).toBe("My App");
  });
});

describe("extractFromHtml - App Links Android", () => {
  const result = extractFromHtml(fixtures.appLinks, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts al:android:url", () => {
    expect(result.data.appLinks?.android?.[0]?.url).toBe("myapp://content/123");
  });

  it("extracts al:android:package", () => {
    expect(result.data.appLinks?.android?.[0]?.package).toBe(
      "com.example.myapp"
    );
  });

  it("extracts al:android:app_name", () => {
    expect(result.data.appLinks?.android?.[0]?.appName).toBe("My App");
  });
});

describe("extractFromHtml - App Links Web", () => {
  const result = extractFromHtml(fixtures.appLinks, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts al:web:url", () => {
    expect(result.data.appLinks?.web?.[0]?.url).toBe(
      "https://example.com/content/123"
    );
  });

  it("extracts al:web:should_fallback as boolean", () => {
    expect(result.data.appLinks?.web?.[0]?.shouldFallback).toBe(true);
  });
});

describe("extractFromHtml - App Links with false should_fallback", () => {
  const htmlWithFalseFallback = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:web:url" content="https://example.com/page" />
      <meta property="al:web:should_fallback" content="false" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithFalseFallback, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("parses should_fallback=false correctly", () => {
    expect(result.data.appLinks?.web?.[0]?.shouldFallback).toBe(false);
  });
});

describe("extractFromHtml - App Links iphone and ipad", () => {
  const htmlWithMorePlatforms = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:iphone:url" content="myapp://iphone/123" />
      <meta property="al:iphone:app_store_id" content="111111111" />
      <meta property="al:iphone:app_name" content="My iPhone App" />
      <meta property="al:ipad:url" content="myapp://ipad/123" />
      <meta property="al:ipad:app_store_id" content="222222222" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMorePlatforms, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts iphone platform data", () => {
    expect(result.data.appLinks?.iphone?.[0]?.url).toBe("myapp://iphone/123");
    expect(result.data.appLinks?.iphone?.[0]?.appStoreId).toBe("111111111");
    expect(result.data.appLinks?.iphone?.[0]?.appName).toBe("My iPhone App");
  });

  it("extracts ipad platform data", () => {
    expect(result.data.appLinks?.ipad?.[0]?.url).toBe("myapp://ipad/123");
    expect(result.data.appLinks?.ipad?.[0]?.appStoreId).toBe("222222222");
  });
});

describe("extractFromHtml - App Links Windows platforms", () => {
  const htmlWithWindowsPlatforms = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:windows:url" content="myapp://windows/123" />
      <meta property="al:windows:app_name" content="My Windows App" />
      <meta property="al:windows_phone:url" content="myapp://winphone/123" />
      <meta property="al:windows_phone:app_name" content="My Windows Phone App" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithWindowsPlatforms, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts windows platform data", () => {
    expect(result.data.appLinks?.windows?.[0]?.url).toBe("myapp://windows/123");
    expect(result.data.appLinks?.windows?.[0]?.appName).toBe("My Windows App");
  });

  it("extracts windows_phone platform data", () => {
    expect(result.data.appLinks?.windowsPhone?.[0]?.url).toBe(
      "myapp://winphone/123"
    );
    expect(result.data.appLinks?.windowsPhone?.[0]?.appName).toBe(
      "My Windows Phone App"
    );
  });
});

describe("extractFromHtml - App Links android class property", () => {
  const htmlWithClass = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:android:class" content="com.example.myapp.MainActivity" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithClass, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts android class property", () => {
    expect(result.data.appLinks?.android?.[0]?.class).toBe(
      "com.example.myapp.MainActivity"
    );
  });
});

describe("extractFromHtml - App Links empty", () => {
  const htmlWithNoAppLinks = `
    <!doctype html>
    <html>
    <head>
      <title>No App Links</title>
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithNoAppLinks, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("returns undefined when no app links present", () => {
    expect(result.data.appLinks).toBeUndefined();
  });
});

describe("extractFromHtml - App Links with multiple iOS apps", () => {
  const htmlWithMultipleApps = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:ios" />
      <meta property="al:ios:url" content="applinks_v2://docs" />
      <meta property="al:ios:app_store_id" content="12345" />
      <meta property="al:ios:app_name" content="App Links V2" />
      <meta property="al:ios" />
      <meta property="al:ios:url" content="applinks_v1://browse" />
      <meta property="al:ios:app_name" content="App Links V1" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMultipleApps, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts multiple iOS app entries", () => {
    expect(result.data.appLinks?.ios).toHaveLength(2);
  });

  it("extracts first iOS app correctly", () => {
    expect(result.data.appLinks?.ios?.[0]?.url).toBe("applinks_v2://docs");
    expect(result.data.appLinks?.ios?.[0]?.appStoreId).toBe("12345");
    expect(result.data.appLinks?.ios?.[0]?.appName).toBe("App Links V2");
  });

  it("extracts second iOS app correctly", () => {
    expect(result.data.appLinks?.ios?.[1]?.url).toBe("applinks_v1://browse");
    expect(result.data.appLinks?.ios?.[1]?.appName).toBe("App Links V1");
    expect(result.data.appLinks?.ios?.[1]?.appStoreId).toBeUndefined();
  });
});

describe("extractFromHtml - App Links with multiple Android apps", () => {
  const htmlWithMultipleAndroid = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:android" />
      <meta property="al:android:url" content="myapp://premium" />
      <meta property="al:android:package" content="com.example.premium" />
      <meta property="al:android:app_name" content="Premium App" />
      <meta property="al:android" />
      <meta property="al:android:url" content="myapp://free" />
      <meta property="al:android:package" content="com.example.free" />
      <meta property="al:android:app_name" content="Free App" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMultipleAndroid, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts multiple Android app entries", () => {
    expect(result.data.appLinks?.android).toHaveLength(2);
  });

  it("extracts first Android app correctly", () => {
    expect(result.data.appLinks?.android?.[0]?.url).toBe("myapp://premium");
    expect(result.data.appLinks?.android?.[0]?.package).toBe(
      "com.example.premium"
    );
    expect(result.data.appLinks?.android?.[0]?.appName).toBe("Premium App");
  });

  it("extracts second Android app correctly", () => {
    expect(result.data.appLinks?.android?.[1]?.url).toBe("myapp://free");
    expect(result.data.appLinks?.android?.[1]?.package).toBe(
      "com.example.free"
    );
    expect(result.data.appLinks?.android?.[1]?.appName).toBe("Free App");
  });
});

describe("extractFromHtml - App Links without boundary markers", () => {
  const htmlWithoutBoundaryMarkers = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:ios:url" content="app1://path" />
      <meta property="al:ios:app_name" content="App One" />
      <meta property="al:ios:url" content="app2://path" />
      <meta property="al:ios:app_name" content="App Two" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithoutBoundaryMarkers, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("detects multiple entries from repeated properties", () => {
    expect(result.data.appLinks?.ios).toHaveLength(2);
  });

  it("extracts first app entry", () => {
    expect(result.data.appLinks?.ios?.[0]?.url).toBe("app1://path");
    expect(result.data.appLinks?.ios?.[0]?.appName).toBe("App One");
  });

  it("extracts second app entry", () => {
    expect(result.data.appLinks?.ios?.[1]?.url).toBe("app2://path");
    expect(result.data.appLinks?.ios?.[1]?.appName).toBe("App Two");
  });
});

describe("extractFromHtml - App Links Windows Universal platform", () => {
  const htmlWithWindowsUniversal = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:windows_universal:url" content="myapp://universal/123" />
      <meta property="al:windows_universal:app_id" content="a14e93aa-27c7-df11-a844-00237de2db9f" />
      <meta property="al:windows_universal:app_name" content="My Universal App" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithWindowsUniversal, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts windows_universal platform data", () => {
    expect(result.data.appLinks?.windowsUniversal?.[0]?.url).toBe(
      "myapp://universal/123"
    );
    expect(result.data.appLinks?.windowsUniversal?.[0]?.appId).toBe(
      "a14e93aa-27c7-df11-a844-00237de2db9f"
    );
    expect(result.data.appLinks?.windowsUniversal?.[0]?.appName).toBe(
      "My Universal App"
    );
  });
});

describe("extractFromHtml - App Links app_id for Windows platforms", () => {
  const htmlWithWindowsAppId = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:windows:url" content="myapp://windows/123" />
      <meta property="al:windows:app_id" content="b25e94bb-38d8-ef22-b955-11348df3da0g" />
      <meta property="al:windows:app_name" content="My Windows App" />
      <meta property="al:windows_phone:url" content="myapp://winphone/123" />
      <meta property="al:windows_phone:app_id" content="c36f05cc-49e9-fg33-c066-22459eg4eb1h" />
      <meta property="al:windows_phone:app_name" content="My Windows Phone App" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithWindowsAppId, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts app_id for windows platform", () => {
    expect(result.data.appLinks?.windows?.[0]?.appId).toBe(
      "b25e94bb-38d8-ef22-b955-11348df3da0g"
    );
  });

  it("extracts app_id for windows_phone platform", () => {
    expect(result.data.appLinks?.windowsPhone?.[0]?.appId).toBe(
      "c36f05cc-49e9-fg33-c066-22459eg4eb1h"
    );
  });
});

describe("extractFromHtml - App Links with multiple web fallbacks", () => {
  const htmlWithMultipleWeb = `
    <!doctype html>
    <html>
    <head>
      <meta property="al:web" />
      <meta property="al:web:url" content="https://example.com/primary" />
      <meta property="al:web:should_fallback" content="true" />
      <meta property="al:web" />
      <meta property="al:web:url" content="https://example.com/secondary" />
      <meta property="al:web:should_fallback" content="false" />
    </head>
    <body></body>
    </html>
  `;

  const result = extractFromHtml(htmlWithMultipleWeb, {
    baseUrl: "https://example.com",
  }) as ExtractSuccess;

  it("extracts multiple web entries", () => {
    expect(result.data.appLinks?.web).toHaveLength(2);
  });

  it("extracts first web entry correctly", () => {
    expect(result.data.appLinks?.web?.[0]?.url).toBe(
      "https://example.com/primary"
    );
    expect(result.data.appLinks?.web?.[0]?.shouldFallback).toBe(true);
  });

  it("extracts second web entry correctly", () => {
    expect(result.data.appLinks?.web?.[1]?.url).toBe(
      "https://example.com/secondary"
    );
    expect(result.data.appLinks?.web?.[1]?.shouldFallback).toBe(false);
  });
});
