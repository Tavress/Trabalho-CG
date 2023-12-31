import vertShaderSrc from './phong.vert.js';
import fragShaderSrc from './phong.frag.js';

import Shader from './shader.js';
import { HalfEdgeDS } from './half-edge.js';
import Scene from './main.js'

export default class Mesh {
  constructor(delta, rotateAxis, size) {
    // model data structure
    this.heds = new HalfEdgeDS();

    // Matriz de modelagem
    this.angle = 0;
    this.delta = delta;
    this.model = mat4.create();

    // Shader program
    this.vertShd = null;
    this.fragShd = null;
    this.program = null;

    // Data location
    this.vaoLoc = -1;
    this.indicesLoc = -1;

    this.uModelLoc = -1;
    this.uViewLoc = -1;
    this.uProjectionLoc = -1;

    this.rotateAxis = rotateAxis;
    this.size = size;

    this.selectedVertex = null;
    this.selectedVaoLoc = null;
    this.selectedIndicesLoc = null;

    this.selIndex = -1;
  }

  findSelectedVertexHalfEdge(index) {
    const ver = this.heds.vertices[index];
    for (var i = 0; i < this.heds.halfEdges.length; i++)
      if (ver == this.heds.halfEdges[i].vertex)
        return this.heds.halfEdges[i];
  }

  async loadMeshV4() {
    const resp = await fetch('model.obj');
    const text = await resp.text();

    const txtList = text.split(/\s+/)
    const data = txtList.map(d => +d);

    const nv = data[0];
    const nt = data[1];

    const coords = [];
    const indices = [];

    for (let did = 2; did < data.length; did++) {
      if (did < 4 * nv + 2) {
        coords.push(data[did]);
      }
      else {
        indices.push(data[did]);
      }
    }

    console.log(coords, indices);
    this.heds.build(coords, indices);
  }

  //Carregar OBJ
  async loadMeshV5(path) {
    const response = await fetch(path);
    const text = await response.text();

    const coords = [];
    const indices = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(' ');
      if (parts[0] === 'v') {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        coords.push(x, y, z, 1.0);
      } else if (parts[0] === 'f') {
        const a = parseInt(parts[1]) - 1;
        const b = parseInt(parts[2]) - 1;
        const c = parseInt(parts[3]) - 1;
        indices.push(a, b, c);
      }
    }
    console.log(coords, indices);
    this.heds.build(coords, indices);
  }

  createShader(gl) {
    this.vertShd = Shader.createShader(gl, gl.VERTEX_SHADER, vertShaderSrc);
    this.fragShd = Shader.createShader(gl, gl.FRAGMENT_SHADER, fragShaderSrc);
    this.program = Shader.createProgram(gl, this.vertShd, this.fragShd);

    gl.useProgram(this.program);
  }

  createUniforms(gl) {
    this.uModelLoc = gl.getUniformLocation(this.program, "u_model");
    this.uViewLoc = gl.getUniformLocation(this.program, "u_view");
    this.uProjectionLoc = gl.getUniformLocation(this.program, "u_projection");
  }

  createVAO(gl) {
    const vbo = this.heds.getVBO(this.selIndex);
    const log = document.querySelector("#log");
    const p = `Positions: ${vbo[0]}\n`;
    const c = `Colors: ${vbo[1]}\n`;
    const n = `Normals: ${vbo[2]}\n`;
    const i = `Indices: ${vbo[3]}\n`;
    log.innerHTML = p + c + n + i;

    const vbos = this.heds.getVBOs(this.selIndex);
    console.log(vbos);

    var coordsAttributeLocation = gl.getAttribLocation(this.program, "position");
    const coordsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(vbos[0]));

    var colorsAttributeLocation = gl.getAttribLocation(this.program, "color");
    const colorsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(vbos[1]));

    var normalsAttributeLocation = gl.getAttribLocation(this.program, "normal");
    const normalsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(vbos[2]));

    this.vaoLoc = Shader.createVAO(gl,
      coordsAttributeLocation, coordsBuffer,
      colorsAttributeLocation, colorsBuffer,
      normalsAttributeLocation, normalsBuffer);

    this.indicesLoc = Shader.createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(vbos[3]));
  }

  setSelectedIndex(index) {
    this.selIndex = index;
  }

  getIndexArray() {
    return this.heds.getVBO(this.selIndex)[3];
  }

  createSelectedVAO(gl, index) {
    const vbos = this.heds.getVBO(index);
    const log = document.querySelector("#log");
    const p = `Positions: ${vbos[0]}\n`;
    const c = `Colors: ${vbos[1]}\n`;
    const n = `Normals: ${vbos[2]}\n`;
    const i = `Indices: ${vbos[3]}\n`;
    log.innerHTML = p + c + n + i;
    console.log(vbos);

    var coordsAttributeLocation = gl.getAttribLocation(this.program, "position");
    const coordsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(vbos[0]));

    var colorsAttributeLocation = gl.getAttribLocation(this.program, "color");
    const colorsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array([1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0])); // Hardcoded

    var normalsAttributeLocation = gl.getAttribLocation(this.program, "normal");
    const normalsBuffer = Shader.createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(vbos[2]));

    this.selectedVaoLoc = Shader.createVAO(gl,
      coordsAttributeLocation, coordsBuffer,
      colorsAttributeLocation, colorsBuffer,
      normalsAttributeLocation, normalsBuffer);

    this.selectedIndicesLoc = Shader.createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(vbos[3]));
  }


  init(gl, light) {
    this.createShader(gl);
    this.createUniforms(gl);
    this.createVAO(gl);

    light.createUniforms(gl, this.program);
  }

  updateModelMatrix() {
    this.angle += 0.05;

    mat4.identity(this.model);
    mat4.translate(this.model, this.model, [this.delta, 0, 0]);
    // [1 0 0 delta, 0 1 0 0, 0 0 1 0, 0 0 0 1] * this.mat 

    if (Scene.rotateObjs) mat4.rotate(this.model, this.model, this.angle, this.rotateAxis);


    //
    // [ cos(this.angle) 0 -sin(this.angle) 0, 
    //         0         1        0         0, 
    //   sin(this.angle) 0  cos(this.angle) 0, 
    //         0         0        0         1]
    // * this.mat 

    mat4.translate(this.model, this.model, [-0.25, -0.25, -0.25]);
    // [1 0 0 -0.5, 0 1 0 -0.5, 0 0 1 -0.5, 0 0 0 1] * this.mat 

    mat4.scale(this.model, this.model, this.size);
    // [5 0 0 0, 0 5 0 0, 0 0 5 0, 0 0 0 1] * this.mat 
  }

  draw(gl, cam, light) {
    // faces orientadas no sentido anti-horário
    gl.frontFace(gl.CCW);

    // face culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.useProgram(this.program);

    // updates the model transformations
    this.updateModelMatrix();

    const model = this.model;
    const view = cam.getView();
    const proj = cam.getProj();

    gl.uniformMatrix4fv(this.uModelLoc, false, model);
    gl.uniformMatrix4fv(this.uViewLoc, false, view);
    gl.uniformMatrix4fv(this.uProjectionLoc, false, proj);


    gl.bindVertexArray(this.vaoLoc);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesLoc);

    gl.drawElements(gl.TRIANGLES, this.heds.faces.length * 3, gl.UNSIGNED_INT, 0);

    gl.disable(gl.CULL_FACE);
  }
}