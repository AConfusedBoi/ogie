import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { parseProfile } from "../../src/parsers/profile";

describe("parseProfile - basic metadata extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="profile:first_name" content="John" />
      <meta property="profile:last_name" content="Doe" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("extracts first name", () => {
    expect(result.firstName).toBe("John");
  });

  it("extracts last name", () => {
    expect(result.lastName).toBe("Doe");
  });
});

describe("parseProfile - username extraction", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="profile:username" content="johndoe123" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("extracts username", () => {
    expect(result.username).toBe("johndoe123");
  });
});

describe("parseProfile - gender validation", () => {
  it("accepts 'male' as valid gender", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:gender" content="male" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.gender).toBe("male");
  });

  it("accepts 'female' as valid gender", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:gender" content="female" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.gender).toBe("female");
  });

  it("rejects invalid gender values", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:gender" content="other" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.gender).toBeUndefined();
  });

  it("rejects uppercase gender values", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:gender" content="Male" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.gender).toBeUndefined();
  });

  it("rejects empty gender value", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:gender" content="" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.gender).toBeUndefined();
  });
});

describe("parseProfile - complete metadata", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="profile:first_name" content="Jane" />
      <meta property="profile:last_name" content="Smith" />
      <meta property="profile:username" content="janesmith" />
      <meta property="profile:gender" content="female" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("extracts all metadata fields", () => {
    expect(result).toEqual({
      firstName: "Jane",
      gender: "female",
      lastName: "Smith",
      username: "janesmith",
    });
  });
});

describe("parseProfile - og:profile prefix support", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="og:profile:first_name" content="Bob" />
      <meta property="og:profile:last_name" content="Johnson" />
      <meta property="og:profile:username" content="bobjohnson" />
      <meta property="og:profile:gender" content="male" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("extracts first name with og:profile prefix", () => {
    expect(result.firstName).toBe("Bob");
  });

  it("extracts last name with og:profile prefix", () => {
    expect(result.lastName).toBe("Johnson");
  });

  it("extracts username with og:profile prefix", () => {
    expect(result.username).toBe("bobjohnson");
  });

  it("extracts gender with og:profile prefix", () => {
    expect(result.gender).toBe("male");
  });
});

describe("parseProfile - name attribute support", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta name="profile:first_name" content="Alice" />
      <meta name="profile:last_name" content="Williams" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("extracts first name from name attribute", () => {
    expect(result.firstName).toBe("Alice");
  });

  it("extracts last name from name attribute", () => {
    expect(result.lastName).toBe("Williams");
  });
});

describe("parseProfile - empty or missing fields", () => {
  it("returns undefined for missing first name", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:last_name" content="Doe" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.firstName).toBeUndefined();
  });

  it("returns undefined for missing last name", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:first_name" content="John" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.lastName).toBeUndefined();
  });

  it("returns undefined for missing username", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:first_name" content="John" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.username).toBeUndefined();
  });

  it("returns undefined for missing gender", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:first_name" content="John" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result.gender).toBeUndefined();
  });

  it("returns all undefined for empty head", () => {
    const html = `
      <!doctype html>
      <html>
      <head></head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);
    expect(result).toEqual({
      firstName: undefined,
      gender: undefined,
      lastName: undefined,
      username: undefined,
    });
  });
});

describe("parseProfile - whitespace handling", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="profile:first_name" content="  John  " />
      <meta property="profile:last_name" content="  Doe  " />
      <meta property="profile:username" content="  johndoe  " />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("trims whitespace from first name", () => {
    expect(result.firstName).toBe("John");
  });

  it("trims whitespace from last name", () => {
    expect(result.lastName).toBe("Doe");
  });

  it("trims whitespace from username", () => {
    expect(result.username).toBe("johndoe");
  });
});

describe("parseProfile - mixed property and name attributes", () => {
  const html = `
    <!doctype html>
    <html>
    <head>
      <meta property="profile:first_name" content="PropertyValue" />
      <meta name="profile:last_name" content="NameValue" />
    </head>
    <body></body>
    </html>
  `;

  const $ = load(html);
  const result = parseProfile($);

  it("extracts from property attribute", () => {
    expect(result.firstName).toBe("PropertyValue");
  });

  it("extracts from name attribute", () => {
    expect(result.lastName).toBe("NameValue");
  });
});
