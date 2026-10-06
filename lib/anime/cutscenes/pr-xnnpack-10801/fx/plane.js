// plane.js (fx-local helper, promote candidate): a "picture plane" that always faces the lens, sits just BEHIND the seal
// (so the depth test keeps the seal whole and never covered), and is sized to exactly fill the frustum there.
// A mesh placed with `onPlane` gets matrixWorld = T(cam + fwd*d) * R(cam) * S(H, H, 1) at render time, where
// d = (chest depth along the view axis) + behind, and H = 2 d tan(fov/2) is the frame height in metres at that depth.
// Coordinates inside the plane are therefore frame-height units (y in [-0.5, 0.5], x in [-asp/2, asp/2]).
export function makePlane(THREE, seal, behind = 0.6) {
  const chest = new THREE.Vector3(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), fwd = new THREE.Vector3();
  const size = new THREE.Vector2(), P = new THREE.Matrix4(), S = new THREE.Vector3(), tmp = new THREE.Vector3();
  const frame = { asp: 16 / 9, px: 1 / 720, sealUV: new THREE.Vector2(), H: 1, d: 1 };
  function update(camera, renderer) {
    camera.getWorldPosition(pos);
    camera.getWorldQuaternion(q);
    fwd.set(0, 0, -1).applyQuaternion(q);
    seal.chest(chest);
    const depth = Math.max(1, tmp.copy(chest).sub(pos).dot(fwd));
    const d = Math.min(depth + behind, (camera.far || 1000) * 0.9);
    const H = 2 * d * Math.tan((camera.fov * Math.PI) / 360);
    frame.asp = camera.aspect || 16 / 9; frame.H = H; frame.d = d;
    if (renderer && renderer.getDrawingBufferSize) {
      renderer.getDrawingBufferSize(size);
      if (size.y > 0) frame.px = 1 / size.y;
    }
    tmp.copy(chest).project(camera);
    frame.sealUV.set(tmp.x * frame.asp * 0.5, tmp.y * 0.5);
    S.set(H, H, 1);
    P.compose(tmp.copy(pos).addScaledVector(fwd, d), q, S);
    return frame;
  }
  // world point -> plane units (frame-height units, y up)
  function toUV(w, camera, out) {
    tmp.copy(w).project(camera);
    return out.set(tmp.x * (camera.aspect || frame.asp) * 0.5, tmp.y * 0.5);
  }
  // onPlane(mesh, hook): mesh.userData.local (a Matrix4 in plane units) is applied inside the plane. hook(frame, camera) may set uniforms.
  function onPlane(mesh, hook) {
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldNeedsUpdate = false;
    mesh.onBeforeRender = (renderer, scene, camera) => {
      update(camera, renderer);
      if (hook) hook(frame, camera);
      mesh.matrixWorld.copy(P);
      if (mesh.userData.local) mesh.matrixWorld.multiply(mesh.userData.local);
    };
    return mesh;
  }
  return { frame, update, onPlane, toUV };
}
