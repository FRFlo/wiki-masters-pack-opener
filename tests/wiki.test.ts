import { describe, expect, test } from "bun:test";
import { WikiMasters } from "../services/wiki";

const account = (cookie = "") => ({
	id: 1,
	discord_user_id: "test-user",
	name: "Test",
	cookie,
	timezone: "Europe/Paris",
	enabled: 1,
});

describe("WikiMasters HTTP client", () => {
	test("sends an unauthenticated pack request without a body", async () => {
		const originalFetch = globalThis.fetch;
		let request: Request | undefined;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		};

		try {
			await new WikiMasters(account()).openPack();
			expect(request?.method).toBe("POST");
			expect(request?.headers.get("cookie")).toBe("");
			expect(request?.body).toBeNull();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("sends the session cookie and reports HTTP errors", async () => {
		const originalFetch = globalThis.fetch;
		let request: Request | undefined;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
		};

		try {
			await expect(new WikiMasters(account("session=abc")).balance()).rejects.toThrow(
				"Wiki Masters HTTP 401: Non autorisé",
			);
			expect(request?.headers.get("cookie")).toBe("session=abc");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("uses a chunked base64 session token for Supabase", async () => {
		const originalFetch = globalThis.fetch;
		let request: Request | undefined;
		const token = ["eyJhbGciOiJIUzI1NiJ9", ".eyJzdWIiOiJ1c2VyLTEyMyJ9", ".signature"].join("");
		const encoded = `base64-${Buffer.from(JSON.stringify({ access_token: token })).toString("base64")}`;
		globalThis.fetch = async (input, init) => {
			request = new Request(input, init);
			return new Response("[]", { status: 200 });
		};

		try {
			await new WikiMasters(
				account(
					`sb-cyrxjeppjqsxxjayfrur-auth-token.0=${encoded.slice(0, 20)}; sb-cyrxjeppjqsxxjayfrur-auth-token.1=${encoded.slice(20)}`,
				),
			).userTags();
			expect(request?.headers.get("authorization")).toBe(`Bearer ${token}`);
			expect(request?.url).toContain("tags?user_id=eq.user-123");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
