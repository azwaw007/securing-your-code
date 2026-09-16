/** Compress a picked photo to a small JPEG data URL (offline / localStorage friendly). */

function loadViaFileReader(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('decode'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export async function compressImageFile(
  file: File,
  maxSide = 480,
  quality = 0.72,
): Promise<string> {
  let w = 0
  let h = 0
  let draw: CanvasImageSource

  try {
    const bitmap = await createImageBitmap(file)
    w = bitmap.width
    h = bitmap.height
    draw = bitmap
  } catch {
    // iOS / HEIC / certains JPEG galerie : FileReader + Image
    const img = await loadViaFileReader(file)
    w = img.naturalWidth || img.width
    h = img.naturalHeight || img.height
    draw = img
  }

  const scale = Math.min(1, maxSide / Math.max(w, h))
  const outW = Math.max(1, Math.round(w * scale))
  const outH = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(draw, 0, 0, outW, outH)
  if ('close' in draw && typeof (draw as ImageBitmap).close === 'function') {
    ;(draw as ImageBitmap).close()
  }

  return canvas.toDataURL('image/jpeg', quality)
}
