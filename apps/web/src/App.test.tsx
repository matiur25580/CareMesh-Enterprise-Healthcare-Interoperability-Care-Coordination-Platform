import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "./App";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("CareMesh dashboard", () => {
  it("clearly limits the workspace to synthetic data and provides tenant login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ status: "ok", database: "connected", service: "caremesh-api" })
    }));
    render(<App />);
    expect(screen.getByText(/development \/ synthetic data only/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /welcome to caremesh/i })).toBeTruthy();
    expect(screen.getByLabelText(/organization \/ tenant id/i)).toBeTruthy();
    expect(screen.getByLabelText(/work email/i)).toBeTruthy();
    expect(await screen.findByText(/api online/i)).toBeTruthy();
  });
});