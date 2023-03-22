<template>
    <div id="canvas-container" class="canvas-container" ref="screenDom"></div>
</template>

<script setup>
import * as THREE from 'three';
import { defineComponent, onMounted, ref } from "vue";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import Stats from 'three/addons/libs/stats.module.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

//导入dat.gui
import * as dat from "dat.gui";


let camera, scene, renderer, stats, effect

onMounted(() => {
    init()
    animate()
})

function init() {
    const container = document.getElementById("canvas-container")

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.z = 50;
    camera.position.y = 30;



    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 0, 500);


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
    initPetals()
}
function animate() {

    requestAnimationFrame(animate);

    stats.begin();
    updatePetals()

    effect.render(scene, camera);
    stats.end();

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
    for (var i = 0; i < 1000; i++) {
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
</script>
<style scoped></style>