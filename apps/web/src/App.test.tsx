import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Mapgen web app", () => {
  it("generates ten multi-room candidates and lets the user select one", () => {
    render(<App />);
    expect(screen.getAllByRole("button", { name: /候选地图/ })).toHaveLength(10);
    expect(screen.getByText("Seed 104729")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("基础 Seed"), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: /生成 10 个候选/ }));
    expect(screen.getByText("Seed 900")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "候选地图 4，Seed 903" }));
    expect(screen.getByText(/当前候选 04 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText("Seed 903")).toBeInTheDocument();
  });

  it("selects topology and range parameters, then marks stale output", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("布局模式"), { target: { value: "hub" } });
    fireEvent.change(screen.getByLabelText("走廊宽度最小值"), { target: { value: "6" } });
    expect(screen.getAllByText(/参数已改变/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "导出 GLB + JSON" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /生成 10 个候选/ }));
    expect(screen.getByText("HUB", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("6 m", { selector: "dd" })).toBeInTheDocument();
  });

  it("restores the confirmed original defaults", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("地图宽度"), { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "恢复原版默认" }));
    expect(screen.getByLabelText("地图宽度")).toHaveValue(160);
    expect(screen.getByLabelText("房间数下限最小值")).toHaveValue(5);
  });
});
