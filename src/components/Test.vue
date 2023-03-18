<template>
    <div class="contioner"></div>
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

let camera, scene, renderer, effect;
let ready, listener

let container


const clock = new THREE.Clock();



Ammo().then(function (AmmoLib) {

    Ammo = AmmoLib;
    init();
    initScenceModel()
    //animate();


});

function init() {

    container = document.createElement('div');
    container.style.position = "fixed"
    container.style.left = 0
    container.style.top = 0
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.rotation.order = 'YXZ';
    camera.position.z = 50;
    camera.position.y = 30;

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10;
    controls.maxDistance = 100;

    window.addEventListener('resize', onWindowResize);

    initListener()

}





function onProgress(xhr) {

    if (xhr.lengthComputable) {

        const percentComplete = xhr.loaded / xhr.total * 100;
        //console.log(Math.round(percentComplete, 2) + '% downloaded');

    }


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

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
        controls(deltaTime);
        updatePlayer(deltaTime);
        // updateSpheres(deltaTime);
        // teleportPlayerIfOob();
    }


    effect.render(scene, camera);

    stats.update();
    requestAnimationFrame(animate);

}

const worldOctree = new Octree();
const playerCollider = new Capsule(new THREE.Vector3(0, 10, 50), new THREE.Vector3(0, 40, 20), 0.35);
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = true;
let mouseTime = 0;
const GRAVITY = 30;
const keyStates = {};

function controls(deltaTime) {

    // gives a bit of air control
    const speedDelta = deltaTime * (playerOnFloor ? 30 : 15);

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
    if (keyStates['Ctrl']) {

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

    playerCollisions();

    camera.position.copy(playerCollider.end);

}
function playerCollisions() {

    const result = worldOctree.capsuleIntersect(playerCollider);

    if (camera.position.y >= 0) {
        playerOnFloor = true;
    } else {
        playerOnFloor = false;
    }

    console.log(result);

    if (result) {

        playerOnFloor = result.normal.y > 0;
        // if (camera.position.y <= 0) {
        //     playerOnFloor = true;
        // }
        console.log(camera.position.y);


        if (!playerOnFloor) {

            playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));

        }

        playerCollider.translate(result.normal.multiplyScalar(result.depth));

    }

}

function initScenceModel() {
    const loader = new GLTFLoader().setPath('/scence/');

    loader.load('la_night_city.glb', (gltf) => {

        console.log(gltf);
        scene.add(gltf.scene);

        worldOctree.fromGraphNode(gltf.scene);

        gltf.scene.traverse(child => {

            if (child.isMesh) {

                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material.map) {

                    child.material.map.anisotropy = 4;

                }

            }

        });

        const helper = new OctreeHelper(worldOctree);
        helper.visible = false;
        scene.add(helper);

        // const gui = new dat.GUI({ width: 200 });
        // gui.add({ debug: false }, 'debug')
        //     .onChange(function (value) {

        //         helper.visible = value;

        //     });
    });
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