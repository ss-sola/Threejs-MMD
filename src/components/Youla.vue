<template>
  <div id="canvas-container" class="canvas-container" ref="screenDom"></div>
  <div id="info">
        若地面没有图案,请刷新重试
    </div>
  <div id="overlay">
    <button @click="start" id="startButton">
      <div>{{ progress == 100 ? 'play' : progress + '%' }}</div>
      <!-- <div>若地面没有图案</div>
      <div>请刷新重试</div> -->
    </button>
  </div>
</template>

<script setup>
import * as THREE from 'three';
import { defineComponent, onMounted, ref } from "vue";

import Stats from 'three/addons/libs/stats.module.js';

//导入dat.gui
import * as dat from "dat.gui";

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let stats;

let mesh, camera, scene, renderer, effect;
let helper, ikHelper, physicsHelper;
let ready, listener, audio, loader;

let bloomPass, finalComposer
const ENTIRE_SCENE = 0, BLOOM_SCENE = 3;

const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
const materials = {};
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const params = {
  exposure: 1,
  bloomStrength: 0.7,
  bloomThreshold: 0,
  bloomRadius: 1
};
const clock = new THREE.Clock();


//资源加载完毕时渲染画面
let progress = ref(0);

THREE.DefaultLoadingManager.onProgress = function (item, loaded, total) {
  // console.log(item, loaded, total);
  progress.value = new Number((loaded / total) * 100).toFixed(2);
};


Ammo().then(function (AmmoLib) {

  Ammo = AmmoLib;
  init();
  animate();
});

const start = () => {
  if (progress.value != 100) return;
  const overlay = document.getElementById('overlay');
  overlay.remove();
  audio.play();
  // 向场景中添加音频对象和参数对象
  helper.add(audio, { delayTime: 0 });
  ready = true
}


function init() {

  const container = document.getElementById("canvas-container")

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 50;
  camera.position.y = 30;

  listener = new THREE.AudioListener();
  camera.add(listener);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 0, 500);


  // 对光照进行调整
  const ambient = new THREE.AmbientLight(0xffffff, 0.95);
  scene.add(ambient);
  const light = new THREE.DirectionalLight(0xf5bd00, 0.1);
  scene.add(light);

  //
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  effect = new OutlineEffect(renderer);

  // STATS

  stats = new Stats();
  container.appendChild(stats.dom);

  const modelFile = './mmd/model/优拉/model.pmx';
  const vmdFiles = ['./mmd/vmd/热爱105度的你/action.vmd'];

  helper = new MMDAnimationHelper({
    afterglow: 2.0
  });

  loader = new MMDLoader();

  loader.loadWithAnimation(modelFile, vmdFiles, function (mmd) {

    mesh = mmd.mesh;
    mesh.castShadow = true
    scene.add(mesh);
    helper.add(mesh, {
      animation: mmd.animation,
      physics: true
    });

    helper.enable('ik', false);
    effect.enabled = false
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

    initAudio()


    initGui();

  }, onProgress, null);

  //loadModel('/scence/《弹指醉》场景配布/scene.pmx')
  loadGltfModel('/scence/model.glb')
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 1000;

  window.addEventListener('resize', onWindowResize);

  initPointLight(30, 7, 20)
  initPointLight(30, 7, -20)
  initPointLight(-30, 7, 20)
  initPointLight(-30, 7, -20)
  initPetals()

  instFireworks()
  initFireworks()

  initComposer()

  function initGui() {

    const api = {
      'animation': true,
      'ik': false,
      'outline': false,
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
        helper.add(audio, { delayTime: 0 });
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
    // gui.add(params, 'exposure', 0.1, 2).onChange(function (value) {

    //   renderer.toneMappingExposure = Math.pow(value, 4.0);

    // });

    // gui.add(params, 'bloomThreshold', 0.0, 1.0).onChange(function (value) {

    //   bloomPass.threshold = Number(value);

    // });

    gui.add(params, 'bloomStrength', 0.0, 3.0).onChange(function (value) {

      bloomPass.strength = Number(value);

    });

    gui.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange(function (value) {

      bloomPass.radius = Number(value);

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
    audio.setLoop(true);

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
  if (ready) {
    helper.update(clock.getDelta());
    updatePetals()
    updateFireworks(clock.getDelta())
  }

  // effect.render(scene, camera);
  stats.end();
  render();

}

// 创建一个数组，用于存储100个花瓣对象
var petals = [];
function initPetals() {
  //endRander()
  var shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.5, 1.5, 1.5, 1.5, 2, 0);
  shape.bezierCurveTo(1.5, -1.5, 0.5, -1.5, 0, 0);

  // 创建一个花瓣的几何体
  const geometry = new THREE.ShapeGeometry(shape);

  // 创建一个纹理加载器，用于加载花瓣的图片
  var textureLoader = new THREE.TextureLoader();
  var material = new THREE.MeshBasicMaterial({
    map: textureLoader.load('/textures/h.jpg'), // 使用Getty Images提供的图片作为纹理
    transparent: true // 设置透明度为true，以便显示图片中的透明部分
  });

  // 循环创建100个花瓣对象，并添加到场景中
  for (var i = 0; i < 200; i++) {
    // 创建一个网格对象，使用上面定义的几何体和材质
    var petal = new THREE.Mesh(geometry, material);

    // 随机设置花瓣的位置和旋转角度
    petal.position.x = Math.random() * 100 - 50;
    petal.position.y = Math.random() * 100 - 50;
    petal.position.z = Math.random() * 100 - 50;
    petal.rotation.x = Math.random() * Math.PI * 2;
    petal.rotation.y = Math.random() * Math.PI * 2;
    petal.rotation.z = Math.random() * Math.PI * 2;

    // 随机设置花瓣的速度
    petal.velocityX = Math.random() * 0.2 - 0.01;
    petal.velocityY = -Math.random() * 0.01 - 0.05;
    petal.velocityZ = Math.random() * 0.02 - 0.01;

    petal.material.side = THREE.DoubleSide;
    petal.scale.set(0.5, 0.2, 0.5);

    petal.layers.enable(BLOOM_SCENE)
    // 将花瓣对象添加到数组中
    petals.push(petal);
    // 将花瓣对象添加到场景中
    scene.add(petal);
  }
}

function updatePetals() {
  // 循环遍历所有的花瓣对象，并更新它们的位置和旋转角度 
  for (var i = 0; i < petals.length; i++) {
    var petal = petals[i];

    // // 更新速度和加速度 
    // petal.velocityX += petal.accelerationX;
    // petal.velocityY += petal.accelerationY;
    // petal.velocityZ += petal.accelerationZ;

    // 更新位置和旋转角度 
    petal.position.x += petal.velocityX;
    petal.position.y += petal.velocityY;
    petal.position.z += petal.velocityZ;
    petal.rotation.x += petal.velocityX / 10;
    petal.rotation.y += petal.velocityY / 10;
    // 如果花瓣的位置超出了屏幕的范围，就将它重置到屏幕顶部 
    if (petal.position.y < -5) {
      petal.position.x = Math.random() * 100 - 50;
      petal.position.y = 60;
      petal.position.z = Math.random() * 100 - 50;
      petal.velocityX = Math.random() * 0.02 - 0.01;
      petal.velocityY = -Math.random() * 0.1 - 0.05;
      petal.velocityZ = Math.random() * 0.02 - 0.01;
    }
  }
}

//花瓣辉光效果
let bloomComposer
function initComposer() {
  const renderScene = new RenderPass(scene, camera);

  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;

  bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(renderScene);
  bloomComposer.addPass(bloomPass);

  const finalPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture }
      },
      vertexShader: document.getElementById('vertexshader').textContent,
      fragmentShader: document.getElementById('fragmentshader').textContent,
      defines: {}
    }), 'baseTexture'
  );
  finalPass.needsSwap = true;

  finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(renderScene);
  finalComposer.addPass(finalPass);
}

function render() {
  // render the entire scene, then render bloom scene on top
  scene.traverse(darkenNonBloomed);
  bloomComposer.render();
  scene.traverse(restoreMaterial);
  finalComposer.render();

}

function darkenNonBloomed(obj) {

  if (bloomLayer.test(obj.layers) != true) {

    materials[obj.uuid] = obj.material;
    obj.material = darkMaterial;

  }

}

function restoreMaterial(obj) {

  if (materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];

  }

}



//点光源
function initPointLight(x, y, z) {
  // 创建球体当灯泡
  let radius = 0.5;
  const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 10,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  //pointLightArr.push(sphere);
  sphere.position.set(x, y, z);

  let pointLight = new THREE.PointLight(0xebce97, 0.5, 20, 1);
  pointLight.layers.enable(BLOOM_SCENE)
  sphere.add(pointLight);
  scene.add(sphere)
}

function loadModel(path) {

  loader.load(path, (mmd) => {

    for (var i = 0; i < mmd.material.length; i++) {
      mmd.material[i].uniforms.shininess.value = 10
    }
    mmd.layers.enable(BLOOM_SCENE)
    mmd.material[3].emissive = new THREE.Color(0x000000)
    console.log(mmd);
    mmd.castShadow = true
    scene.add(mmd)
  }, onProgress, null)
}

const materialColors = [
  {
    name: '柱水晶',
    color: 0x515ba5
  },
  {
    name: '万象天文-地板装饰',
    color: 0x252e59
  },
  {
    name: "柱水晶边框",
    color: 0xafa04c
  },
  {
    name: "水晶",
    color: 0x4c5488
  },
  {
    name: "水晶边框",
    color: 0xe9d5aa
  },
  {
    name: "吊饰水晶",
    color: 0x4c5488
  },
  {
    name: "吊饰四面体",
    color: 0xe9d5aa
  },
  {
    name: "四面体",
    color: 0xe9d5aa
  },
  {
    name: "吊饰水晶边框",
    color: 0xe9d5aa
  },
  {
    name: "圆环",
    color: 0xeceeed
  },
  {
    name: "主体1",
    color: 0xffff49
  }
]
function loadGltfModel(path) {
  const dracoLoader = new DRACOLoader();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(path, (gltf) => {
    const model = gltf.scene;
    model.traverse((obj) => {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.isMesh) {
        obj.layers.enable(BLOOM_SCENE)
        for (var i = 0; i < materialColors.length; i++) {
          if (obj.name == materialColors[i].name) {
            obj.material.color = new THREE.Color(materialColors[i].color)
          }
        }


        obj.material.side = THREE.DoubleSide;
      }
    })
    //model.scale.set(5, 5, 5)
    console.log(gltf);
    scene.add(model)

  }, null, null)
}

//烟花效果
let total = 10;//烟花数
let fireworks = [], isDead = []
const particleCount = 1000; // 粒子数量
const particleSize = 1.0; // 粒子大小


function instFireworks() {
  for (var i = 0; i < total; i++) {
    // 创建烟花粒子

    const color = Math.random() * 0xffffff
    // 创建一个画布元素
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    // 设置画布的宽度和高度
    canvas.width = 64;
    canvas.height = 64;

    // 绘制一个圆形
    context.beginPath();
    context.arc(32, 32, 30, 0, Math.PI * 2);
    context.fillStyle = 'white';
    context.fill();

    // 创建一个CanvasTexture对象，并设置其源为画布元素
    var texture = new THREE.CanvasTexture(canvas);
    // 创建烟花几何体
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        new Array(particleCount * 3).fill(0),
        3
      )
    );
    geometry.setAttribute(
      "velocity",
      new THREE.Float32BufferAttribute(
        new Array(particleCount * 3).fill(0),
        3
      )
    );

    // 创建烟花材质
    const material = new THREE.PointsMaterial({
      size: particleSize,
      color: color,
      transparent: true,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      map: texture,
      transparent: true
    });
    //const pointLight = new THREE.PointLight(color, 0.1);
    // 创建烟花对象
    const firework = new THREE.Points(geometry, material);
    firework.layers.enable(3)
    //firework.add(pointLight)
    fireworks.push(firework)
    // 将烟花添加到场景中
    scene.add(firework);
    isDead[i] = 0

  }
}

// 定义一个函数，用于初始化烟花的位置和速度
const initFireworks = () => {
  for (let i = 0; i < total; i++) {
    isDead[i] = clock.getElapsedTime()
    setTimeout(() => {
      // 获取烟花的位置和速度属性
      const positions = fireworks[i].geometry.attributes.position.array;
      const velocities = fireworks[i].geometry.attributes.velocity.array;

      var x = Math.random() * 300 - 150;
      var y = y = Math.random() * 20 + 20;
      var z = Math.random() * 20 - 110;
      // 遍历每个粒子
      for (let i = 0; i < particleCount; i++) {
        // 设置粒子的初始位置为原点
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // 设置一个随机的角度和半径
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 40;

        // 设置粒子的初始速度为沿着球面均匀分布的方向和大小
        velocities[i * 3] = radius * Math.cos(angle);
        velocities[i * 3 + 1] = radius * Math.sin(angle);
        velocities[i * 3 + 2] = 0

      }


      // 更新烟花的位置和速度属性
      fireworks[i].geometry.attributes.position.needsUpdate = true;
      fireworks[i].geometry.attributes.velocity.needsUpdate = true;
    }, Math.random() * 5000)


  }

};
// 定义一个函数，用于更新烟花的位置和速度
const updateFireworks = (delta) => {
  for (let i = 0; i < total; i++) {
    // 获取烟花的位置和速度属性
    const positions = fireworks[i].geometry.attributes.position.array;
    const velocities = fireworks[i].geometry.attributes.velocity.array;

    // 定义一个变量，用于判断烟花是否已经消失


    // 遍历每个粒子
    for (let i = 0; i < particleCount; i++) {
      // 获取粒子的位置和速度
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const vx = velocities[i * 3];
      const vy = velocities[i * 3 + 1];
      const vz = velocities[i * 3 + 2];

      // 更新粒子的位置，根据速度和时间间隔
      positions[i * 3] += vx * delta;
      positions[i * 3 + 1] += vy * delta;
      positions[i * 3 + 2] += vz * delta;

      // 更新粒子的速度，根据重力加速度
      velocities[i * 3 + 1] -= 10 / particleCount;

    }

    // 更新烟花的位置和速度属性
    fireworks[i].geometry.attributes.position.needsUpdate = true;
    fireworks[i].geometry.attributes.velocity.needsUpdate = true;

    // 如果烟花已经消失，重新初始化烟花
    const time = clock.getElapsedTime()

    for (var j = 0; j < total; j++) {
      if (time - isDead[i] >= 3) {

        initFireworks();
      }
    }

  }

};

</script>
<style scoped>
.canvas-container {
  position: fixed;
  left: 0;
  top: 0;

}

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
#info {
    color:#ffffff;
	position: fixed;
	top: 0px;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
	text-align: center;
	-moz-user-select: none;
	-webkit-user-select: none;
	-ms-user-select: none;
	user-select: none;
	pointer-events: none;
	z-index: 1; /* TODO Solve this in HTML */
}
</style>