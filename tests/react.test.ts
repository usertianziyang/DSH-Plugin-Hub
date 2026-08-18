import { afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { JSDOM } from "jsdom";
import type { Snapshot } from "../src/types";

type RenderFn = typeof import("@testing-library/react").render;
type Screen = typeof import("@testing-library/react").screen;
type FireEvent = typeof import("@testing-library/react").fireEvent;
type AppComponent = Awaited<typeof import("../src/App")>["default"];

let render: RenderFn;
let screen: Screen;
let fireEvent: FireEvent;
let cleanup: () => void;
let App: AppComponent;

function defineGlobal(key: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  } catch {
    // Some globals (e.g. Node's built-in navigator) are non-configurable.
    // Node's own implementation is sufficient for React.
  }
}

function installDom(): void {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const { window } = dom;

  defineGlobal("window", window);
  defineGlobal("document", window.document);
  defineGlobal("navigator", window.navigator);
  defineGlobal("IS_REACT_ACT_ENVIRONMENT", true);

  for (const key of Object.getOwnPropertyNames(window)) {
    if (!(key in globalThis)) {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        get: () => (window as unknown as Record<string, unknown>)[key],
      });
    }
  }
}

function snapshot(items: Snapshot["items"], complete = true): Snapshot {
  return {
    meta: {
      schema_version: 1,
      topic: "dsh-plugin",
      source: "github-rest-search",
      topic_url: "https://github.com/topics/dsh-plugin",
      query: "topic:dsh-plugin",
      fetched_at: "2026-08-17T03:40:03.000Z",
      total_count: items.length,
      complete,
    },
    items,
  };
}

const EXAMPLE_ITEM = {
  id: 123456789,
  name: "example-plugin",
  full_name: "owner/example-plugin",
  owner: "owner",
  owner_avatar_url: "https://avatars.githubusercontent.com/u/123?v=4",
  url: "https://github.com/owner/example-plugin",
  homepage: null,
  description: "Example DSH plugin.",
  stars: 100,
  forks: 10,
  open_issues: 2,
  language: "TypeScript",
  license: "MIT",
  topics: ["dsh-plugin"],
  fork: false,
  archived: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-08-17T00:00:00Z",
  pushed_at: "2026-08-16T00:00:00Z",
};

function rankedItem(id: number, stars: number): Snapshot["items"][number] {
  return {
    ...EXAMPLE_ITEM,
    id,
    name: `plugin-${id}`,
    full_name: `owner/plugin-${id}`,
    owner_avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    url: `https://github.com/owner/plugin-${id}`,
    stars,
  };
}

before(async () => {
  installDom();
  const rtl = await import("@testing-library/react");
  render = rtl.render;
  screen = rtl.screen;
  fireEvent = rtl.fireEvent;
  cleanup = rtl.cleanup;
  const appModule = await import("../src/App");
  App = appModule.default;
});

function nextTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

beforeEach(async () => {
  window.history.replaceState(null, "", "/");
  await nextTurn();
  window.history.replaceState(null, "", "/");
});

afterEach(async () => {
  cleanup();
  await nextTurn();
  window.history.replaceState(null, "", "/");
});

test("renders an accessible data-source link and repository cards on success", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(snapshot([EXAMPLE_ITEM])), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  render(createElement(App));

  const sourceLink = await screen.findByRole("link", {
    name: /GitHub Topic dsh-plugin/i,
  });
  const footer = screen.getByRole("contentinfo");
  assert.equal(footer.querySelector("h2")?.id, "footer-title");
  assert.equal(sourceLink.getAttribute("href"), "https://github.com/topics/dsh-plugin");
  assert.equal(sourceLink.getAttribute("rel"), "noopener noreferrer");

  const repoLink = await screen.findByRole("link", {
    name: /Open owner\/example-plugin on GitHub/i,
  });
  assert.equal(repoLink.getAttribute("href"), "https://github.com/owner/example-plugin");

  assert.ok(screen.getByLabelText("100 stars"));
  assert.ok(screen.getByText("Example DSH plugin."));
});

test("renders only the ten highest-starred repositories", async () => {
  const items = [4, 12, 8, 11, 1, 9, 6, 2, 10, 7, 5, 3].map((stars, index) =>
    rankedItem(index + 1, stars),
  );
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(snapshot(items)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  render(createElement(App));

  const cards = await screen.findAllByRole("article");
  assert.equal(cards.length, 10);
  assert.match(cards[0]?.textContent ?? "", /owner\/plugin-2/);
  assert.equal(
    screen.queryByRole("link", { name: /owner\/plugin-5 on GitHub/i }),
    null,
  );
  assert.equal(
    screen.queryByRole("link", { name: /owner\/plugin-8 on GitHub/i }),
    null,
  );

  fireEvent.click(screen.getByRole("button", { name: /^Explore$/i }));
  assert.equal(screen.getAllByRole("article").length, 12);

  fireEvent.click(
    screen.getByRole("button", { name: /Other.*show all categories/i }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Uncategorized/i }));

  assert.equal(screen.getAllByRole("article").length, 12);
  assert.ok(
    screen.getByRole("link", { name: /owner\/plugin-5 on GitHub/i }),
  );
});

test("distinguishes the error state from a successful load", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;

  render(createElement(App));

  const alert = await screen.findByRole("alert");
  assert.match(alert.textContent ?? "", /Failed to load data/);
});

test("shows an empty state for an unsynced snapshot", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(snapshot([], false)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  render(createElement(App));

  await screen.findByText(/No data yet/i);
});

test("shows a loading state before the snapshot resolves", async () => {
  let resolveFetch!: (value: Response) => void;
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })) as typeof fetch;

  render(createElement(App));

  assert.ok(screen.getByText(/Loading plugin index/i));

  resolveFetch(new Response(JSON.stringify(snapshot([])), { status: 200 }));
  await screen.findByText(/No data yet/i);
});

test("shows the full-index category navigation in Explore", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(snapshot([EXAMPLE_ITEM])), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  render(createElement(App));

  await screen.findByText(/Explore open-source plugins/i);
  assert.equal(
    screen.getByRole("button", { name: /^Top 10$/i }).getAttribute("aria-pressed"),
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: /^Explore$/i }));

  const allChip = screen.getByRole("button", { name: /^All 1$/i });
  assert.equal(allChip.getAttribute("aria-pressed"), "true");
  assert.equal(screen.queryByText(/Explore open-source plugins/i), null);
  // Less-used and empty category labels remain available through the overflow control.
  const overflow = screen.getByRole("button", { name: /Other.*show all categories/i });
  fireEvent.click(overflow);
  assert.ok(screen.getByRole("button", { name: /Uncategorized/i }));
});

test("switches UI language between English and Chinese", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(snapshot([EXAMPLE_ITEM])), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  render(createElement(App));

  await screen.findByText(/Explore open-source plugins/);

  const toggle = screen.getByRole("button", { name: /Switch to Chinese/i });
  fireEvent.click(toggle);

  await screen.findByText(/探索 DeepSeek Harness/);
  assert.ok(screen.getByRole("button", { name: /Switch to English/i }));
});
