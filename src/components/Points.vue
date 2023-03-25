<template>
    <div id="app">
        <canvas ref="canvas"></canvas>
    </div>
</template>

<script>
import { onMounted, ref } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { color } from "dat.gui";

export default {
    setup() {
        const canvas = ref(null);


        onMounted(() => {
            // 创建场景
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x000000);

            // 创建相机
            const camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            camera.position.set(0, 10, 20);
            camera.lookAt(0, 10, 0)

            // 创建渲染器
            const renderer = new THREE.WebGLRenderer({
                canvas: canvas.value,
                antialias: true,
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            // 创建轨道控制器
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.minDistance = 1;
            controls.maxDistance = 1000;
            controls.enableDamping = true;

            // 创建灯光
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);


            let total = 10;//烟花数
            let fireworks = [], isDead = []
            // 创建烟花粒子
            const particleCount = 1000; // 粒子数量
            const particleSize = 0.1; // 粒子大小
            const particleSpeed = 40; // 粒子速度


            for (var i = 0; i < total; i++) {
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

                const color = Math.random() * 0xffffff
                // 创建烟花材质
                const material = new THREE.PointsMaterial({
                    size: particleSize,
                    color: color,
                    transparent: true,
                    depthTest: false,
                    map: texture,
                    transparent: true
                    //blending: THREE.AdditiveBlending,
                });
                const pointLight = new THREE.PointLight(color, 1);
                // 创建烟花对象
                const firework = new THREE.Points(geometry, material);
                firework.add(pointLight)
                fireworks.push(firework)
                // 将烟花添加到场景中
                scene.add(firework);
                isDead[i] = 0

            }

            // 定义一个函数，用于初始化烟花的位置和速度
            const initFireworks = () => {
                for (let i = 0; i < total; i++) {
                    isDead[i] = clock.getElapsedTime()
                    setTimeout(() => {
                        // 获取烟花的位置和速度属性
                        const positions = fireworks[i].geometry.attributes.position.array;
                        const velocities = fireworks[i].geometry.attributes.velocity.array;

                        var x = Math.random() * 100 - 50;
                        var y = Math.random() * 10 + 5;
                        var z = Math.random() * 5 - 15;
                        // 遍历每个粒子
                        for (let i = 0; i < particleCount; i++) {
                            // 设置粒子的初始位置为原点
                            positions[i * 3] = x;
                            positions[i * 3 + 1] = y;
                            positions[i * 3 + 2] = z;

                            // 设置一个随机的角度和半径
                            const angle = Math.random() * Math.PI * 2;
                            const angle2 = Math.random() * Math.PI * 2;
                            const radius = Math.random() * 3;

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
                        velocities[i * 3 + 1] -= particleSpeed / particleCount;

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

            // 定义一个函数，用于渲染场景
            const render = () => {
                // 获取时间间隔
                const delta = clock.getDelta();

                // 更新轨道控制器
                //controls.update();

                // 更新烟花的位置和速度
                updateFireworks(delta);
                // 渲染场景
                renderer.render(scene, camera);

                // 请求下一帧动画
                requestAnimationFrame(render);
            };

            // 创建一个时钟对象，用于计算时间间隔
            const clock = new THREE.Clock();


            // 初始化烟花
            initFireworks();


            // 开始渲染场景
            render();
        });

        return {
            canvas,
        };
    },
};
</script>
<style>
canvas {
    position: fixed;
    left: 0;
    top: 0;
}
</style>  