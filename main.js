import Camera from './camera.js';
import Light from './light.js';
import Mesh from './mesh.js';

export default class Scene {
  static rotateObjs = true;
  constructor(gl) {
    // Camera virtual
    this.cam = new Camera(gl);

    // Luz
    this.light = new Light();

    // Mesh
    this.mesh = new Mesh(1.0, [0, 0, 1], [0.1, 0.1, 0.1]);
    this.copy = new Mesh(0.0, [0, 1, 0], [0.3, 0.3, 0.3]);
  }

  async init(gl) {
    await this.mesh.loadMeshV5('src/bunny.obj');
    this.mesh.init(gl, this.light);


    await this.copy.loadMeshV5('src/armadillo.obj')
    this.copy.init(gl, this.light);
  }

  draw(gl) {
    this.cam.updateCam();
    this.light.updateLight();

    this.mesh.draw(gl, this.cam, this.light);
    this.light.updateLightEffects(gl, this.mesh.program);
    this.copy.draw(gl, this.cam, this.light);
    this.light.updateLightEffects(gl, this.copy.program);
  }
}



class Main {

  constructor() {
    const canvas = document.querySelector("#glcanvas");

    this.gl = canvas.getContext("webgl2");
    this.setViewport();

    this.scene = new Scene(this.gl);
    this.scene.init(this.gl).then(() => {
      this.draw();
    });

    const submitButton = document.getElementById("submit");
    submitButton.onclick = () => {
      var selectedIndex = Number(this.getSelectedVertex());
      this.getSelectedMesh().setSelectedIndex(selectedIndex);
      this.getSelectedMesh().init(this.gl, this.scene.light);
    }

    const rotateCheckBox = document.getElementById("rotation");
    rotateCheckBox.onchange = () => Scene.rotateObjs = rotateCheckBox.checked;
  }

  getSelectedMesh() {
    var ele = document.getElementsByName('mesh');

    for (var i = 0; i < ele.length; i++) {
      if (ele[i].checked)
        switch (ele[i].value) {
          case "armadillo":
            return this.scene.copy
          case "bunny":
            return this.scene.mesh;
          case _:
            console.warn("Unknown object");
            return null;
        };
    }
  }

  getSelectedVertex() {
    const vertex = document.getElementById("vertex");
    return vertex.value;
  }

  setViewport() {
    var devicePixelRatio = window.devicePixelRatio || 1;
    this.gl.canvas.width = 1024 * devicePixelRatio;
    this.gl.canvas.height = 768 * devicePixelRatio;

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
  }

  draw() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.scene.draw(this.gl);

    requestAnimationFrame(this.draw.bind(this));
  }
}

window.onload = () => {
  const app = new Main();
  app.draw();
}


