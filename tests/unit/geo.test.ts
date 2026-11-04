import { describe, expect, it } from "vitest";
import { calculateDistanceKm, formatDistanceKm } from "@/lib/geo";

describe("calculateDistanceKm", () => {
  it("calculates 0 distance for identical coordinates", () => {
    expect(calculateDistanceKm(10.9804, 106.6519, 10.9804, 106.6519)).toBe(0);
  });

  it("calculates realistic distance between Thu Dau Mot and Thuan An (~14 km)", () => {
    // Thu Dau Mot (11.0264, 106.6348) to Thuan An (10.9239, 106.7143)
    const dist = calculateDistanceKm(11.0264, 106.6348, 10.9239, 106.7143);
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(16);
  });

  it("calculates distance between Hanoi and Ho Chi Minh City (~1130 km)", () => {
    // Hanoi (21.0285, 105.8542) to HCMC (10.8231, 106.6297)
    const dist = calculateDistanceKm(21.0285, 105.8542, 10.8231, 106.6297);
    expect(dist).toBeGreaterThan(1100);
    expect(dist).toBeLessThan(1200);
  });

  it("handles invalid numbers safely", () => {
    expect(calculateDistanceKm(NaN, 10, 20, 30)).toBeNaN();
  });
});

describe("formatDistanceKm", () => {
  it("formats distances in Vietnamese cleanly", () => {
    expect(formatDistanceKm(0.2)).toBe("Dưới 500 m");
    expect(formatDistanceKm(0.8)).toBe("Cách ~800 m");
    expect(formatDistanceKm(4.24)).toBe("Cách ~4.2 km");
    expect(formatDistanceKm(15.78)).toBe("Cách ~15.8 km");
    expect(formatDistanceKm(NaN)).toBe("Không rõ khoảng cách");
  });
});
