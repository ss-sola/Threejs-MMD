<template>
    <div class="contioner"></div>
    <div id="info">
        如果模型比较奇怪，请尝试开启或关闭ik
    </div>
    <div id="overlay">
        <button @click="start" id="startButton">Play</button>
    </div>
</template>
  
<script setup>
import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { onMounted } from 'vue';
//   import {require} from 
//导入dat.gui
import * as dat from "dat.gui";

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';


let stats;

let mesh, camera, scene, renderer, effect;
let helper, ikHelper, physicsHelper;
let ready, listener, audio, audioLoader, mmdLoader;
let mixer, flag = 0;
let container

let modelNames, vmdNames
modelNames = initModelNames()
vmdNames = initVmdNames()

const api = {
    'animation': true,
    'ik': true,
    'outline': true,
    'physics': true,
    'show IK bones': false,
    'show rigid bodies': false,
    'model': '爱莉希雅',
    'action': '极乐净土'
};

const clock = new THREE.Clock();



Ammo().then(function (AmmoLib) {

    Ammo = AmmoLib;
    init();
    animate();


});

const start = () => {

    const overlay = document.getElementById('overlay');
    overlay.remove();
    initAudio('./mmd/vmd/' + api['action'] + '/music.mp3')
    initListener()
    ready = true
}




function init() {

    container = document.createElement('div');
    container.style.position = "fixed"
    container.style.left = 0
    container.style.top = 0
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.rotation.order = 'YXZ';
    camera.position.z = 50;
    camera.position.y = 10;

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
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.VSMShadowMap;
    // renderer.outputEncoding = THREE.sRGBEncoding;
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    effect = new OutlineEffect(renderer);

    // STATS

    stats = new Stats();
    container.appendChild(stats.dom);

    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.minDistance = 10;
    // controls.maxDistance = 100;

    window.addEventListener('resize', onWindowResize);

    initModel(api['model'], api['action'])
    initGui()


}

function initModel(model, action) {

    // model

    const modelFile = './mmd/model/' + model + '/model.pmx';
    const vmdFiles = ['./mmd/vmd/' + action + '/action.vmd'];

    helper = new MMDAnimationHelper({
        afterglow: 2.0
    });

    mmdLoader = new MMDLoader();

    mmdLoader.loadWithAnimation(modelFile, vmdFiles, function (mmd) {

        mesh = mmd.mesh;
        scene.add(mesh);
        console.log(mmd);


        helper.add(mesh, {
            animation: mmd.animation,
            physics: true
        });

        mixer = helper.objects.get(mesh).mixer;


        // const cameraFiles = ['./mmd/vmd/热爱105度的你/camera.vmd'];
        // loader.loadAnimation(cameraFiles, camera, function (cameraAnimation) {

        //     helper.add(camera, {
        //         animation: cameraAnimation
        //     });
        // })
        if (audio) {
            audio.stop();
            audio.play()
        }


        ikHelper = helper.objects.get(mesh).ikSolver.createHelper();
        ikHelper.visible = false;
        scene.add(ikHelper);

        physicsHelper = helper.objects.get(mesh).physics.createHelper();
        physicsHelper.visible = false;
        scene.add(physicsHelper);

    }, onProgress, null);

}

function initGui() {
    const gui = new dat.GUI();

    gui.add(api, 'animation').onChange(function (value) {

        helper.enable('animation', api['animation']);
        if (value) {
            audio.play();
        }
        else {
            // 暂停音频的播放
            audio.pause();
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
    gui.add(api, 'model').options(modelNames).onChange(() => {
        scene.remove(mesh);
        initModel(api['model'], api['action'])
        mixer.stopAllAction()
    })
    gui.add(api, 'action').options(vmdNames).onChange(() => {
        //scene.remove(mesh);
        mixer.stopAllAction()
        audio.pause();
        loadVmd('./mmd/vmd/' + api['action'] + '/action.vmd')
        initAudio('./mmd/vmd/' + api['action'] + '/music.wav', './mmd/vmd/' + api['action'] + '/music.mp3')

    })

}

function loadModel(path) {

    if (!mmdLoader) {
        mmdLoader = new MMDLoader();
    }

    if (mesh) {
        scene.remove(mesh);
    }
    mmdLoader.load(path, (mmd) => {
        mesh = mmd;
        scene.add(mesh)
        const ik = new CCDIKSolver(mesh, mesh.geometry.userData.MMD.iks);
        //    console.log(ik);
        //     scene.add(ik)
        mixer = new THREE.AnimationMixer(mesh);
        loadVmd('./mmd/vmd/极乐净土/action.vmd')

    }, onProgress, null)
}


function loadVmd(path) {
    if (!mmdLoader) {
        mmdLoader = new MMDLoader();
    }
    mmdLoader.loadAnimation(path, mesh, (animate) => {
        mixer.uncacheAction()
        const vmd = mixer.clipAction(animate, mesh)
        vmd.play()

    }, onProgress, null)
}


function initModelNames() {
    const modulesFiles = import.meta.glob('/public/mmd/model/**/*.*')
    // 遍历对象，获取每个文件夹的名称
    let folders = []
    for (const path in modulesFiles) {
        // 获取文件夹名称，如./src/assets
        let folder = path.split('/')[4]
        // 去重并添加到数组中
        if (!folders.includes(folder)) {
            folders.push(folder)
        }
    }
    return folders;
}
function initVmdNames() {
    const modulesFiles = import.meta.glob('/public/mmd/vmd/**/*.*')
    // 遍历对象，获取每个文件夹的名称
    let folders = []
    for (const path in modulesFiles) {
        // 获取文件夹名称，如./src/assets
        let folder = path.split('/')[4]
        // 去重并添加到数组中
        if (!folders.includes(folder)) {
            folders.push(folder)
        }
    }
    return folders;
}

function onProgress(xhr) {

    if (xhr.lengthComputable) {

        const percentComplete = xhr.loaded / xhr.total * 100;
        //console.log(Math.round(percentComplete, 2) + '% downloaded');

    }


}
function initAudio(path, path2) {

    if (!audioLoader || !audio) {
        audioLoader = new THREE.AudioLoader();
        audio = new THREE.Audio(listener)
    }
    // if (flag >= 2) return;
    audioLoader.load(path, function (buffer) {
        audio.setBuffer(buffer);
        audio.setLoop(true);
        // audio.setVolume(0.5);
        audio.play()
        ready = true;
        flag = 0

    }, onProgress, () => {
        initAudio(path2)
    });
    flag++;
}

function initListener() {
    container.addEventListener('mousedown', () => {

        document.body.requestPointerLock();

        mouseTime = performance.now();

    });
    document.body.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === document.body) {
            camera.rotation.y -= event.movementX / 500;
            camera.rotation.x -= event.movementY / 500;

        }

    });
    document.addEventListener('keydown', (event) => {

        keyStates[event.code] = true;

    });

    document.addEventListener('keyup', (event) => {

        keyStates[event.code] = false;

    });
}


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    effect.setSize(window.innerWidth, window.innerHeight);

}

const STEPS_PER_FRAME = 5
function animate() {

    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
    if (ready) {
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
            controls(deltaTime);
            updatePlayer(deltaTime);
            helper.update(deltaTime);
            // updateSpheres(deltaTime);
            // teleportPlayerIfOob();
        }


    }
    effect.render(scene, camera);

    stats.update();
    requestAnimationFrame(animate);

}

const playerCollider = new Capsule(new THREE.Vector3(0, -20, 50), new THREE.Vector3(0, 10, 50), 1);
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = true;
let mouseTime = 0;
const GRAVITY = 30;
const keyStates = {};

function controls(deltaTime) {

    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 80 : 80);

    if (keyStates['KeyW']) {

        playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));

    }

    if (keyStates['KeyS']) {

        playerVelocity.add(getForwardVector().multiplyScalar(- speedDelta));

    }

    if (keyStates['KeyA']) {

        playerVelocity.add(getSideVector().multiplyScalar(- speedDelta));

    }

    if (keyStates['KeyD']) {

        playerVelocity.add(getSideVector().multiplyScalar(speedDelta));

    }

    if (playerOnFloor) {

        if (keyStates['Space']) {

            playerVelocity.y = 15;

        }

    }
    if (keyStates['ControlLeft'] || keyStates['ControlRight']) {

        playerVelocity.y = -15;

    }


}
function getSideVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();
    playerDirection.cross(camera.up);

    return playerDirection;

}
function getForwardVector() {

    camera.getWorldDirection(playerDirection);
    playerDirection.y = 0;
    playerDirection.normalize();

    return playerDirection;

}
function updatePlayer(deltaTime) {

    let damping = Math.exp(- 4 * deltaTime) - 1;

    if (!playerOnFloor) {

        playerVelocity.y -= GRAVITY * deltaTime;

        // small air resistance
        damping *= 0.1;

    }

    playerVelocity.addScaledVector(playerVelocity, damping);

    const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
    playerCollider.translate(deltaPosition);

    camera.position.copy(playerCollider.end);

}

</script>
<style scoped>
#info {
    color: #ffffff;
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
    z-index: 1;
    /* TODO Solve this in HTML */
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
</style>