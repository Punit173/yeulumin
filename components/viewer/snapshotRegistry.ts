// Lets non-3D code (cart / collection) ask the live 3D viewer for product shots.
// The viewer registers a capturer while it is mounted; callers get null when no viewer is on screen.

export type GarmentViews = { front: string; back: string };
type Capturer = (size?: number) => GarmentViews | null;

let capturer: Capturer | null = null;

export function registerGarmentCapturer(fn: Capturer): () => void {
  capturer = fn;
  return () => {
    if (capturer === fn) capturer = null;
  };
}

export function captureGarmentViews(size = 512): GarmentViews | null {
  try {
    return capturer ? capturer(size) : null;
  } catch (err) {
    console.error("3D snapshot capture failed:", err);
    return null;
  }
}
