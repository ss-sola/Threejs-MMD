<template>
    <div id="canvas-container" class="canvas-container" ref="screenDom"></div>
</template>

<script setup>
import * as THREE from 'three';
import { defineComponent, onMounted, ref } from "vue";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import Stats from 'three/addons/libs/stats.module.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

//导入dat.gui
import * as dat from "dat.gui";


let camera, scene, renderer, stats, effect
let composer, bloomPass, finalComposer
const ENTIRE_SCENE = 0, BLOOM_SCENE = 3;

let petalMaterial
const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
const materials = {};
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const params = {
    exposure: 1,
    bloomStrength: 0.7,
    bloomThreshold: 0,
    bloomRadius: 1,
    scene: 'Scene with Glow'
};


onMounted(() => {
    init()
    animate()
    initGui()
})

function init() {
    const container = document.getElementById("canvas-container")

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 50;
    camera.position.y = 30;



    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // scene.fog = new THREE.Fog(0x000000, 0, 500);


    // 对光照进行调整
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);


    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    effect = new OutlineEffect(renderer);
    effect.enabled = false


    // STATS

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 1000;

    stats = new Stats();
    container.appendChild(stats.dom);

    //loadMMdModel('/scence/万象天文/万象天文-吊饰.pmx')
    loadGltfModel('/scence/model.glb')
    initPetals()
    initComposer()
}

function initGui() {
    const gui = new dat.GUI();

    gui.add(params, 'exposure', 0.1, 2).onChange(function (value) {

        renderer.toneMappingExposure = Math.pow(value, 4.0);

    });

    gui.add(params, 'bloomThreshold', 0.0, 5.0).onChange(function (value) {

        bloomPass.threshold = Number(value);

    });

    gui.add(params, 'bloomStrength', 0.0, 1.0).step(0.001).onChange(function (value) {

        bloomPass.strength = Number(value);

    });

    gui.add(params, 'bloomRadius', 0.0, 1.0).step(0.01).onChange(function (value) {

        bloomPass.radius = Number(value);

    });
}
function animate() {

    requestAnimationFrame(animate);

    stats.begin();
    updatePetals()

    render();
    stats.end();

}

//setTimeout(()=>{render()},2000)
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
    petalMaterial = new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/h.jpg'), // 使用Getty Images提供的图片作为纹理
        transparent: true // 设置透明度为true，以便显示图片中的透明部分
    });

    // 循环创建100个花瓣对象，并添加到场景中
    for (var i = 0; i < 100; i++) {
        // 创建一个网格对象，使用上面定义的几何体和材质
        var petal = new THREE.Mesh(geometry, petalMaterial);

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
        petal.layers.enable(3)
        // 将花瓣对象添加到数组中
        petals.push(petal);
        // 将立方体添加到selectedObjects数组中
        //outlinePass.selectedObjects.push(petal);

        // 将花瓣对象添加到场景中
        scene.add(petal);
    }
}

function updatePetals() {
    // 循环遍历所有的花瓣对象，并更新它们的位置和旋转角度 
    for (var i = 0; i < petals.length; i++) {
        var petal = petals[i];

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
        name:"柱水晶边框",
        color:0xafa04c
    },
    {
        name:"水晶",
        color:0x4c5488
    },
    {
        name:"水晶边框",
        color:0xe9d5aa
    },
    {
        name:"吊饰水晶",
        color:0x4c5488
    },
    {
        name:"吊饰四面体",
        color:0x4c5488
    },
    {
        name:"四面体",
        color:0xe9d5aa
    },
    {
        name:"吊饰水晶边框",
        color:0xe9d5aa
    },
    {
      name:"圆环",
      color:0xeceeed  
    },
    // {
    //     name:"地板",
    //     color:0x28315e
    // },
    {
        name:"主体1",
        color:0xffff49
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
                for(var i=0;i<materialColors.length;i++){
                    if(obj.name==materialColors[i].name){
                        obj.material.color=new THREE.Color(materialColors[i].color)
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
function loadMMdModel(path) {
    const loader = new MMDLoader();
    loader.load(path, (mmd) => {
        console.log(mmd);
        scene.add(mmd)
    }, null, null)
}
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
    render()
}

function render() {
    // render the entire scene, then render bloom scene on top
    scene.traverse(darkenNonBloomed);
    bloomComposer.render();
    scene.traverse(restoreMaterial);
    finalComposer.render();

}

function darkenNonBloomed(obj) {

    // if (bloomLayer.test(obj.layers) != true) {
    //     materials[obj.uuid] = obj.material;
    //     obj.material = darkMaterial;

    // }

}

function restoreMaterial(obj) {

    if (materials[obj.uuid]) {
        obj.material = materials[obj.uuid];
        delete materials[obj.uuid];

    }

}


</script>
<style scoped></style>