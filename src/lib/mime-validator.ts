const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  pdf: [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  docx: [
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    new Uint8Array([0x50, 0x4b, 0x07, 0x08]),
  ],
  png: [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
  jpg: [new Uint8Array([0xff, 0xd8, 0xff])],
  webp: [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
}

const EXT_TO_TYPE: Record<string, string> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
}

export function validateMime(buffer: Buffer, extension: string): boolean {
  const type = EXT_TO_TYPE[extension.toLowerCase()]
  if (!type || !MAGIC_BYTES[type]) return type === "txt"

  const magicList = MAGIC_BYTES[type]
  return magicList.some((magic) => {
    if (buffer.length < magic.length) return false
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) return false
    }
    return true
  })
}
