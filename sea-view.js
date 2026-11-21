import {
  Color, Mesh, PerspectiveCamera, PlaneGeometry, Scene,
  ShaderMaterial, WebGLRenderer
} from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

export function createSeaView() {
  const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  const scene = new Scene();
  const camera = new PerspectiveCamera(47, 1, .1, 360);
  camera.position.set(0, 17, 25);
  camera.lookAt(0, 0, -12);

  const uniforms = {
    clock: { value: 0 },
    shallow: { value: new Color() },
    deep: { value: new Color() }
  };
  const geometry = new PlaneGeometry(520, 520, 128, 128);
  geometry.rotateX(-Math.PI / 2);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float clock;
      varying vec3 surface;
      void main() {
        surface = position;
        surface.y = .38*sin(position.x*.26+position.z*.31-clock*1.4)
                  + .23*sin(position.z*.58-position.x*.17+clock*1.1)
                  + .12*sin(position.x*.98+position.z*.72-clock*.8);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(surface, 1.);
      }`,
    fragmentShader: `
      uniform float clock;
      uniform vec3 shallow;
      uniform vec3 deep;
      varying vec3 surface;
      void main() {
        vec3 normal = normalize(cross(dFdx(surface), dFdy(surface)));
        vec3 eye = normalize(cameraPosition - surface);
        vec3 light = normalize(vec3(-.36,.68,-.26));
        float distanceFade = smoothstep(6.,110.,length(cameraPosition-surface));
        float reflection = pow(max(dot(normal,normalize(light+eye)),0.),22.);
        float ripples = sin(surface.x*.74+surface.z*1.2+clock*.67)
                      * sin(surface.x*1.28-surface.z*.43-clock*.51);
        float foam = smoothstep(.74,.98,ripples) * (1.-distanceFade);
        vec3 water = mix(shallow,deep,distanceFade*.88);
        water += vec3(.41,.68,.69)*(reflection*.36+foam*.085);
        gl_FragColor = vec4(water,1.);
        #include <colorspace_fragment>
      }`
  });
  scene.add(new Mesh(geometry, material));

  let width = 0;
  let height = 0;
  let lastPalette;
  return {
    draw(time, w, h, palette) {
      if (renderer.getContext().isContextLost()) return null;
      if (w !== width || h !== height) {
        width = w;
        height = h;
        const scale = Math.min(.82, 900 / w, 670 / h);
        renderer.setSize(Math.max(1, Math.floor(w * scale)), Math.max(1, Math.floor(h * scale)), false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      if (palette !== lastPalette) {
        uniforms.shallow.value.set(palette[2]);
        uniforms.deep.value.set(palette[3]);
        scene.background = uniforms.deep.value;
        lastPalette = palette;
      }
      uniforms.clock.value = time;
      renderer.render(scene, camera);
      return renderer.domElement;
    }
  };
}
