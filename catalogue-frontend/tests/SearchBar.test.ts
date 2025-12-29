import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SearchBar from "../src/components/SearchBar.vue";

describe("SearchBar", () => {
  it("renders the search placeholder", () => {
    const wrapper = mount(SearchBar);
    const input = wrapper.get("input");
    expect(input.attributes("placeholder")).toBe("Search catalogue...");
  });

  it("emits the search term on input", async () => {
    const wrapper = mount(SearchBar);
    const input = wrapper.get("input");

    await input.setValue("camera");

    const events = wrapper.emitted("search") || [];
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1]).toEqual(["camera"]);
  });
});
