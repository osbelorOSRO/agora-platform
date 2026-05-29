import "@testing-library/jest-dom";
import { vi } from "vitest";

// lottie-web usa HTMLCanvasElement.getContext() que jsdom no implementa.
// Mockeamos lottie-react globalmente para que los tests de componentes no fallen.
vi.mock("lottie-react", () => ({
  default: () => null,
}));
