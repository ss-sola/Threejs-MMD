<template>
  <div id="overlay">
    <button @click="start" id="startButton">Play</button>
  </div>
</template>

<script setup>
import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';

//导入dat.gui
import * as dat from "dat.gui";

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';

let stats;

let mesh, camera, scene, renderer, effect;
let helper, ikHelper, physicsHelper;
let ready, listener, audio;

const clock = new THREE.Clock();



Ammo().then(function (AmmoLib) {

  Ammo = AmmoLib;
  init();
  animate();


});

const start = () => {

  const overlay = document.getElementById('overlay');
  overlay.remove();
  initAudio()
  ready = true
}




function init() {

  const container = document.createElement('div');
  container.style.position = "fixed"
  container.style.left = 0
  container.style.top = 0
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 50;
  camera.position.y = 30;

  listener = new THREE.AudioListener();
  camera.add(listener);
  // scene.add(camera)
  // scene

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const gridHelper = new THREE.PolarGridHelper(40, 10);
  //gridHelper.position.y = - 10;
  scene.add(gridHelper);


  // 对光照进行调整
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);

  // const directionalLight = new THREE.DirectionalLight(0xffffff);
  // directionalLight.position.set(- 10, 100, 10).normalize();
  // scene.add(directionalLight);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  effect = new OutlineEffect(renderer);

  // STATS

  stats = new Stats();
  container.appendChild(stats.dom);

  // model




  const modelFile = './mmd/model/优拉/model.pmx';
  const vmdFiles = ['./mmd/vmd/热爱105度的你/action.vmd'];

  helper = new MMDAnimationHelper({
    afterglow: 2.0
  });

  const loader = new MMDLoader();

  loader.loadWithAnimation(modelFile, vmdFiles, function (mmd) {

    mesh = mmd.mesh;
    //mesh.position.y = - 10;
    scene.add(mesh);

    helper.add(mesh, {
      animation: mmd.animation,
      physics: true
    });

    helper.enable('ik', false);
    const cameraFiles = ['./mmd/vmd/热爱105度的你/camera.vmd'];
    loader.loadAnimation(cameraFiles, camera, function (cameraAnimation) {

      helper.add(camera, {
        animation: cameraAnimation
      });
    })
    ikHelper = helper.objects.get(mesh).ikSolver.createHelper();
    ikHelper.visible = false;
    scene.add(ikHelper);

    physicsHelper = helper.objects.get(mesh).physics.createHelper();
    physicsHelper.visible = false;
    scene.add(physicsHelper);

    initGui();

  }, onProgress, null);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 100;

  window.addEventListener('resize', onWindowResize);

  function initGui() {

    const api = {
      'animation': true,
      'ik': false,
      'outline': true,
      'physics': true,
      'show IK bones': false,
      'show rigid bodies': false
    };

    const gui = new dat.GUI();

    gui.add(api, 'animation').onChange(function (value) {

      helper.enable('animation', api['animation']);
      helper.enable('cameraAnimation', api['animation']);
      if (value) {

        // 继续音频的播放
        audio.play();
        // 向场景中添加音频对象和参数对象
        helper.add(audio, { delayTime: 160 * 1 / 30 });
        // 同步音频对象的动画
        //helper._syncAudio(audio);

      }
      else {
        // 暂停音频的播放
        audio.pause();
        // 清除音频对象的动画
        //helper._clearAudio(audio);
        // 从场景中移除音频对象
        helper.remove(audio);


      }
    });

    gui.add(api, 'ik').onChange(function () {

      helper.enable('ik', api['ik']);

    });

    gui.add(api, 'outline').onChange(function () {

      effect.enabled = api['outline'];

    });

    gui.add(api, 'physics').onChange(function () {

      helper.enable('physics', api['physics']);

    });

    gui.add(api, 'show IK bones').onChange(function () {

      ikHelper.visible = api['show IK bones'];

    });

    gui.add(api, 'show rigid bodies').onChange(function () {

      if (physicsHelper !== undefined) physicsHelper.visible = api['show rigid bodies'];

    });
    gui.closed = true;

  }

}
function onProgress(xhr) {

  if (xhr.lengthComputable) {

    const percentComplete = xhr.loaded / xhr.total * 100;
    //console.log(Math.round(percentComplete, 2) + '% downloaded');

  }


}
function initAudio() {
  const audioFile = './mmd/vmd/热爱105度的你/music.wav';
  const audioParams = { delayTime: 160 * 1 / 30 };
  new THREE.AudioLoader().load(audioFile, function (buffer) {

    audio = new THREE.Audio(listener).setBuffer(buffer);
    audio.setLoop(false);
    helper.add(audio, { delayTime: 0 });

    ready = true;

  }, onProgress, null);
}
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  requestAnimationFrame(animate);

  stats.begin();
  render();
  stats.end();

}

function render() {
  if (ready) {
    helper.update(clock.getDelta());
    //helper.audioManager.control(clock.getDelta());
  }

  effect.render(scene, camera);

}
</script>
<style scoped>

#overlay {
  position: absolute;
  font-size: 16px;
  z-index: 2;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.7);
}

#overlay button {
  background: transparent;
  border: 0;
  border: 1px solid rgb(255, 255, 255);
  border-radius: 4px;
  color: #ffffff;
  padding: 12px 18px;
  text-transform: uppercase;
  cursor: pointer;
}
</style>