import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class AudioVisualizer {
  constructor() {
    this.setup();
    this.createScene();
    this.setupAudio();
    this.pathProgress = 0;
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
    this.camera.position.set(0, 3, 10);
    this.camera.fov = 85;
    this.camera.updateProjectionMatrix();
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Make controls more restricted
    this.controls.enabled = false; // Disable controls for guided experience

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createScene() {
    // Create expanded palace with maze chambers
    this.createMazePalace();
    
    // Create audio-reactive path
    this.createAudioPath();
  }

  createMazePalace() {
    // Create an expanded floor for the maze palace
    const floorSize = 100;
    const floorSegments = 20;
    const segmentSize = floorSize / floorSegments;
    
    for (let x = 0; x < floorSegments; x++) {
      for (let z = 0; z < floorSegments; z++) {
        const segment = new THREE.Mesh(
          new THREE.PlaneGeometry(segmentSize * 0.98, segmentSize * 0.98),
          new THREE.MeshStandardMaterial({
            color: (x + z) % 2 === 0 ? 0x8B4513 : 0x654321,
            metalness: 0.3,
            roughness: 0.7,
          })
        );
        
        segment.position.set(
          (x - floorSegments/2 + 0.5) * segmentSize,
          0.01,
          (z - floorSegments/2 + 0.5) * segmentSize
        );
        segment.rotation.x = -Math.PI / 2;
        this.scene.add(segment);
      }
    }

    // Create maze chambers
    this.createMazeChambers();
  }

  createMazeChambers() {
    // Define maze layout (1 = wall, 0 = path)
    const mazeSize = 7;
    const maze = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];

    const wallHeight = 8;
    const chamberSize = 12;
    const wallThickness = 1;

    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        if (maze[z][x] === 1) {
          // Create chamber walls
          const wallGeometry = new THREE.BoxGeometry(chamberSize, wallHeight, chamberSize);
          const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xD2B48C,
            metalness: 0.2,
            roughness: 0.8,
          });
          
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(
            (x - mazeSize/2) * chamberSize,
            wallHeight/2,
            (z - mazeSize/2) * chamberSize
          );
          
          // Add architectural details to walls
          this.addWallDetails(wall, chamberSize);
          this.scene.add(wall);
        }
      }
    }

    // Add ceiling to all chambers
    const ceilingGeometry = new THREE.PlaneGeometry(mazeSize * chamberSize, mazeSize * chamberSize);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2B48C,
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    this.scene.add(ceiling);
  }

  addWallDetails(wall, size) {
    // Add decorative pillars at corners
    const cornerPositions = [
      [-size/2, -size/2],
      [-size/2, size/2],
      [size/2, -size/2],
      [size/2, size/2]
    ];

    cornerPositions.forEach(pos => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, wall.scale.y * 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0x8B4513,
          metalness: 0.4,
          roughness: 0.6
        })
      );
      
      pillar.position.set(pos[0], 0, pos[1]);
      wall.add(pillar);
    });

    // Add wall trim
    const trimGeometry = new THREE.BoxGeometry(size, 0.5, size + 0.2);
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.5,
      roughness: 0.5
    });
    
    const topTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    topTrim.position.y = wall.scale.y/2;
    wall.add(topTrim);
    
    const bottomTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    bottomTrim.position.y = -wall.scale.y/2;
    wall.add(bottomTrim);
  }

  createAudioPath() {
    this.pathPoints = [];
    const pathLength = 200; // Increased path length
    
    // Create a more complex path through the maze
    for (let i = 0; i < pathLength; i++) {
      const t = i / pathLength;
      const angle = t * Math.PI * 8; // More rotations
      const radius = 40 - (t * 35); // Larger spiral
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 3 + Math.sin(t * Math.PI * 8) * 2; // Vertical movement
      
      this.pathPoints.push(new THREE.Vector3(x, y, z));
    }

    // Create visual path segments
    this.pathSegments = [];
    for (let i = 0; i < pathLength - 1; i++) {
      const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
      const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.6
      });
      
      const segment = new THREE.Mesh(geometry, material);
      segment.position.copy(this.pathPoints[i]);
      this.scene.add(segment);
      this.pathSegments.push(segment);
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
    
    // Update path segments with more dramatic effects
    const segments = Math.min(this.pathSegments.length, this.dataArray.length);
    for (let i = 0; i < segments; i++) {
      const value = this.dataArray[i] || 0;
      const intensity = value / 255;
      
      const segment = this.pathSegments[i];
      segment.position.y = this.pathPoints[i].y + intensity * 2;
      segment.material.emissiveIntensity = intensity;
      segment.scale.set(
        1 + intensity * 1.5,
        1 + intensity * 3,
        1 + intensity * 1.5
      );
      
      // Enhanced color effects
      const hue = (0.6 - intensity * 0.6 + i * 0.002) % 1;
      segment.material.color.setHSL(hue, 1, 0.5);
      segment.material.emissive.setHSL(hue, 1, 0.5);
    }

    // Update camera position based on audio intensity
    const avgIntensity = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
    this.pathProgress += (0.0001 + (avgIntensity / 25000));
    if (this.pathProgress >= 1) this.pathProgress = 0;

    const currentIndex = Math.floor(this.pathProgress * this.pathPoints.length);
    const lookAheadIndex = (currentIndex + 1) % this.pathPoints.length;
    
    if (this.pathPoints[currentIndex]) {
      this.camera.position.copy(this.pathPoints[currentIndex]);
      this.camera.lookAt(this.pathPoints[lookAheadIndex]);
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
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the visualizer
new AudioVisualizer();