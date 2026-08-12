function installDomPolyfills() {
  if (!(globalThis as any).DOMMatrix) {
    class DOMMatrix {
      a = 1
      b = 0
      c = 0
      d = 1
      e = 0
      f = 0

      constructor(init?: string | Partial<{ a: number; b: number; c: number; d: number; e: number; f: number }>) {
        if (typeof init === "string") {
          if (init.startsWith("matrix3d(")) {
            const v = init.slice(9, -1).split(",").map(Number)
            ;[this.a, this.b, this.c, this.d, this.e, this.f] = [v[0], v[1], v[4], v[5], v[12], v[13]]
          } else if (init.startsWith("matrix(")) {
            const v = init.slice(7, -1).split(",").map(Number)
            ;[this.a, this.b, this.c, this.d, this.e, this.f] = v
          }
        } else if (init) {
          Object.assign(this, init)
        }
      }

      multiply(o: DOMMatrix) {
        const n = new DOMMatrix()
        n.a = this.a * o.a + this.c * o.b
        n.b = this.b * o.a + this.d * o.b
        n.c = this.a * o.c + this.c * o.d
        n.d = this.b * o.c + this.d * o.d
        n.e = this.a * o.e + this.c * o.f + this.e
        n.f = this.b * o.e + this.d * o.f + this.f
        return n
      }

      translate(x: number, y: number) {
        return this.multiply(new DOMMatrix(`matrix(1,0,0,1,${x},${y})`))
      }

      scale(x: number, y: number) {
        return this.multiply(new DOMMatrix(`matrix(${x},0,0,${y},0,0)`))
      }

      rotate(r: number) {
        const c = Math.cos((r * Math.PI) / 180)
        const s = Math.sin((r * Math.PI) / 180)
        return this.multiply(new DOMMatrix(`matrix(${c},${s},${-s},${c},0,0)`))
      }

      transformPoint(p: { x: number; y: number }) {
        return { x: this.a * p.x + this.c * p.y + this.e, y: this.b * p.x + this.d * p.y + this.f }
      }

      static fromMatrix(m: any) {
        return new DOMMatrix(`matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`)
      }

      toString() {
        return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`
      }

      toJSON() {
        return { a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f }
      }
    }

    ;(globalThis as any).DOMMatrix = DOMMatrix
  }

  if (!(globalThis as any).ImageData) {
    ;(globalThis as any).ImageData = class {}
  }

  if (!(globalThis as any).Path2D) {
    ;(globalThis as any).Path2D = class {}
  }
}

export async function loadPdfJs() {
  installDomPolyfills()
  return import("pdfjs-dist/legacy/build/pdf.mjs")
}