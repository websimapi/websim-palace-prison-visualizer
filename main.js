import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class AudioVisualizer {
  constructor() {
    this.setup();
    this.createScene();
    this.setupAudio();
    this.animate();
  }

  setup() {
    this.container = document.getElementById('container');
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    // Camera position
    this.camera.position.set(0, 2, 5);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createScene() {
    // Create palace room
    this.createPalaceRoom();
    
    // Create audio-reactive elements
    this.createAudioReactiveElements();
  }

  createPalaceRoom() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.5,
      roughness: 0.5
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Walls
    const wallsGeometry = new THREE.BoxGeometry(10, 6, 10);
    const wallsMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.BackSide
    });
    const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
    walls.position.y = 3;
    this.scene.add(walls);

    // Decorative pillars
    for (let i = 0; i < 4; i++) {
      const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
      const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.7,
        roughness: 0.3
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.y = 3;
      pillar.position.x = (i < 2 ? -4 : 4);
      pillar.position.z = (i % 2 === 0 ? -4 : 4);
      this.scene.add(pillar);
    }
  }

  createAudioReactiveElements() {
    // Create bars array
    this.bars = [];
    const barCount = 64;
    
    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(0.1, 1, 0.1);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / barCount, 0.8, 0.5),
        metalness: 0.8,
        roughness: 0.2
      });
      const bar = new THREE.Mesh(geometry, material);
      
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 3;
      bar.position.x = Math.cos(angle) * radius;
      bar.position.z = Math.sin(angle) * radius;
      bar.position.y = 2;
      
      this.scene.add(bar);
      this.bars.push(bar);
    }
  }

  setupAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;
    
    this.audio = new Audio('/Bitwave Dreams - Locked Away - Sonauto.wav');
    this.audioSource = this.audioContext.createMediaElementSource(this.audio);
    this.audioSource.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    document.getElementById('playButton').addEventListener('click', () => {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      if (this.audio.paused) {
        this.audio.play();
      } else {
        this.audio.pause();
      }
    });
  }

  updateAudioData() {
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Update bars based on audio data
    for (let i = 0; i < this.bars.length; i++) {
      const value = this.dataArray[i] || 0;
      const scale = (value / 255) * 3 + 0.2;
      this.bars[i].scale.y = scale;
      
      // Update color based on intensity
      this.bars[i].material.color.setHSL(i / this.bars.length, 0.8, scale / 3);
      this.bars[i].material.emissive.setHSL(i / this.bars.length, 0.8, scale / 6);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update audio visualizer
    if (this.analyser) {
      this.updateAudioData();
    }
    
    // Rotate camera slowly
    this.camera.position.x = Math.cos(Date.now() * 0.0001) * 7;
    this.camera.position.z = Math.sin(Date.now() * 0.0001) * 7;
    this.camera.lookAt(0, 2, 0);
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the visualizer
new AudioVisualizer();