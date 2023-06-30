import { describe, expect, test } from '@jest/globals';
import { ApiClient } from "$lib/Api";

describe('sum module', () => {
  let client = new ApiClient("", "")
  test('adds 1 + 2 to equal 3', () => {
    console.log(client.getTimeline());
    expect(1 + 2).toBe(3);
  });
});
