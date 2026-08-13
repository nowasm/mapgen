import type { DungeonLayout } from "@mapgen/layout-schema";
import { Scene } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

import { buildDungeonScene } from "./build-dungeon-scene";

export interface ExportedDungeon {
  readonly baseName: string;
  readonly glb: ArrayBuffer;
  readonly glbSha256: string;
  readonly layoutJson: string;
}

class ArrayBufferFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.({ target: this } as unknown as ProgressEvent<FileReader>);
    }).catch(() => {
      this.onerror?.({ target: this } as unknown as ProgressEvent<FileReader>);
    });
  }

  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      this.result = `data:${blob.type};base64,${btoa(binary)}`;
      this.onloadend?.({ target: this } as unknown as ProgressEvent<FileReader>);
    }).catch(() => {
      this.onerror?.({ target: this } as unknown as ProgressEvent<FileReader>);
    });
  }
}

async function withFileReaderPolyfill<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof globalThis.FileReader !== "undefined") return operation();
  const target = globalThis as typeof globalThis & { FileReader?: typeof FileReader };
  target.FileReader = ArrayBufferFileReader as unknown as typeof FileReader;
  try {
    return await operation();
  } finally {
    delete target.FileReader;
  }
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function exportDungeon(layout: DungeonLayout): Promise<ExportedDungeon> {
  const scene = new Scene();
  scene.name = "MapgenExport";
  scene.add(buildDungeonScene(layout).root);

  const exporter = new GLTFExporter();
  const exported = await withFileReaderPolyfill(() => exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    trs: false,
  }));
  if (!(exported instanceof ArrayBuffer)) throw new TypeError("GLTFExporter did not return a binary GLB");

  const glbSha256 = await sha256Hex(exported);
  const pairedLayout: DungeonLayout = { ...layout, glbSha256 };
  return {
    baseName: `dungeon-${layout.exportId}`,
    glb: exported,
    glbSha256,
    layoutJson: `${JSON.stringify(pairedLayout, null, 2)}\n`,
  };
}
