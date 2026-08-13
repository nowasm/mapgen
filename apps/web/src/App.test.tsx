import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("Mapgen web app", () => {
  it("generates ten candidates and lets the user select one", () => {
    render(<App />);

    expect(screen.getAllByRole("button", { name: /候选地图/ })).toHaveLength(10);
    expect(screen.getByText("Seed 104729")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("基础 Seed"), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: /生成 10 个候选/ }));
    expect(screen.getByText("Seed 900")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "候选地图 4，Seed 903" }));
    expect(screen.getByText("当前候选 04 / 10")).toBeInTheDocument();
    expect(screen.getByText("Seed 903")).toBeInTheDocument();
  });

  it("updates the selected layout from the corridor width control", () => {
    render(<App />);

    fireEvent.change(screen.getByRole("slider", { name: "走廊宽度" }), { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: /生成 10 个候选/ }));

    expect(screen.getByText("6 m", { selector: "output" })).toBeInTheDocument();
  });
});
