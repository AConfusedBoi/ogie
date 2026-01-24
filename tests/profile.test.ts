import { describe, expect, it } from "bun:test";
import { load } from "cheerio";

import { parseProfile } from "../src/parsers/profile";

describe("parseProfile", () => {
  describe("with all fields", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="og:type" content="profile" />
        <meta property="profile:first_name" content="John" />
        <meta property="profile:last_name" content="Doe" />
        <meta property="profile:username" content="johndoe" />
        <meta property="profile:gender" content="male" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);

    it("extracts first_name", () => {
      expect(result.firstName).toBe("John");
    });

    it("extracts last_name", () => {
      expect(result.lastName).toBe("Doe");
    });

    it("extracts username", () => {
      expect(result.username).toBe("johndoe");
    });

    it("extracts gender", () => {
      expect(result.gender).toBe("male");
    });
  });

  describe("gender validation", () => {
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

    it("rejects empty gender", () => {
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

    it("rejects non-standard gender values", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="profile:gender" content="non-binary" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseProfile($);
      expect(result.gender).toBeUndefined();
    });

    it("is case-sensitive (rejects uppercase)", () => {
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
  });

  describe("with og:profile prefix", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="og:type" content="profile" />
        <meta property="og:profile:first_name" content="Jane" />
        <meta property="og:profile:last_name" content="Smith" />
        <meta property="og:profile:username" content="janesmith" />
        <meta property="og:profile:gender" content="female" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);

    it("extracts first_name with og:profile prefix", () => {
      expect(result.firstName).toBe("Jane");
    });

    it("extracts last_name with og:profile prefix", () => {
      expect(result.lastName).toBe("Smith");
    });

    it("extracts username with og:profile prefix", () => {
      expect(result.username).toBe("janesmith");
    });

    it("extracts gender with og:profile prefix", () => {
      expect(result.gender).toBe("female");
    });
  });

  describe("with missing optional fields", () => {
    it("handles missing first_name", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="profile:last_name" content="Doe" />
          <meta property="profile:username" content="johnd" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseProfile($);
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBe("Doe");
      expect(result.username).toBe("johnd");
    });

    it("handles missing last_name", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="profile:first_name" content="John" />
          <meta property="profile:username" content="johnd" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseProfile($);
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBeUndefined();
      expect(result.username).toBe("johnd");
    });

    it("handles missing username", () => {
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
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
      expect(result.username).toBeUndefined();
    });

    it("handles missing gender", () => {
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
      expect(result.firstName).toBe("John");
      expect(result.lastName).toBe("Doe");
      expect(result.gender).toBeUndefined();
    });

    it("handles only username provided", () => {
      const html = `
        <!doctype html>
        <html>
        <head>
          <meta property="profile:username" content="cooluser123" />
        </head>
        <body></body>
        </html>
      `;
      const $ = load(html);
      const result = parseProfile($);
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.username).toBe("cooluser123");
      expect(result.gender).toBeUndefined();
    });
  });

  describe("with no profile metadata", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <title>No profile metadata</title>
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);

    it("returns undefined for all fields", () => {
      expect(result.firstName).toBeUndefined();
      expect(result.lastName).toBeUndefined();
      expect(result.username).toBeUndefined();
      expect(result.gender).toBeUndefined();
    });
  });

  describe("with name attribute instead of property", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta name="profile:first_name" content="Alex" />
        <meta name="profile:last_name" content="Johnson" />
        <meta name="profile:username" content="alexj" />
        <meta name="profile:gender" content="male" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);

    it("extracts first_name from name attribute", () => {
      expect(result.firstName).toBe("Alex");
    });

    it("extracts last_name from name attribute", () => {
      expect(result.lastName).toBe("Johnson");
    });

    it("extracts username from name attribute", () => {
      expect(result.username).toBe("alexj");
    });

    it("extracts gender from name attribute", () => {
      expect(result.gender).toBe("male");
    });
  });

  describe("whitespace handling", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:first_name" content="  John  " />
        <meta property="profile:last_name" content="  Doe  " />
        <meta property="profile:username" content="  johnd  " />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);

    it("trims whitespace from first_name", () => {
      expect(result.firstName).toBe("John");
    });

    it("trims whitespace from last_name", () => {
      expect(result.lastName).toBe("Doe");
    });

    it("trims whitespace from username", () => {
      expect(result.username).toBe("johnd");
    });
  });

  describe("priority of standard prefix over og:profile prefix", () => {
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta property="profile:first_name" content="Primary" />
        <meta property="og:profile:first_name" content="Secondary" />
      </head>
      <body></body>
      </html>
    `;
    const $ = load(html);
    const result = parseProfile($);

    it("prefers standard profile: prefix over og:profile: prefix", () => {
      expect(result.firstName).toBe("Primary");
    });
  });
});
