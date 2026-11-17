// FX for _hero: none; the test is the character alone.
export default function build(ctx) {
  return { group: new ctx.THREE.Group(), update() {}, dispose() {} };
}
