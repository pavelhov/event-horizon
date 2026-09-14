// CSS (including imported fonts) may finish loading after the game starts.
// Check the displayed size before rendering rather than relying on window resize.
export function createRenderSizeSync(canvas, renderer, composer, camera, viewport, onResize) {
  let width = 0, height = 0, pixelRatio = 0;
  return function syncRenderSize() {
    const nextWidth = canvas.clientWidth || viewport.innerWidth;
    const nextHeight = canvas.clientHeight || viewport.innerHeight;
    const nextPixelRatio = Math.min(viewport.devicePixelRatio || 1, 1.7);
    if (nextWidth <= 0 || nextHeight <= 0) return false;
    if (nextWidth === width && nextHeight === height && nextPixelRatio === pixelRatio) return false;

    if (nextPixelRatio !== pixelRatio) {
      renderer.setPixelRatio(nextPixelRatio);
      composer.setPixelRatio(nextPixelRatio);
    }
    renderer.setSize(nextWidth, nextHeight, false);
    composer.setSize(nextWidth, nextHeight);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextPixelRatio;
    onResize?.();
    return true;
  };
}
