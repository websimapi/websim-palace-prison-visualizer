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
    // Create detailed palace room
    this.createDetailedPalace();
    
    // Create audio-reactive path
    this.createAudioPath();
  }

  createDetailedPalace() {
    // Enhanced Floor with improved texture pattern and rendering
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide // Ensures floor is visible from both sides
    });
    
    // Create floor segments for better visual detail
    const floorSegments = 4;
    const segmentSize = 20 / floorSegments;
    
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
          0.01, // Slight elevation to prevent z-fighting
          (z - floorSegments/2 + 0.5) * segmentSize
        );
        segment.rotation.x = -Math.PI / 2;
        this.scene.add(segment);
      }
    }

    // Add base floor for complete coverage
    const baseFloor = new THREE.Mesh(floorGeometry, floorMaterial);
    baseFloor.rotation.x = -Math.PI / 2;
    baseFloor.position.y = 0;
    this.scene.add(baseFloor);

    // Walls and other elements remain the same
    this.createWalls();
    this.createCeiling();
    this.addDecorativeElements();
  }

  createWalls() {
    // Main walls
    const wallsGeometry = new THREE.BoxGeometry(20, 12, 20);
    const wallsMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2B48C,
      metalness: 0.2,
      roughness: 0.8,
      side: THREE.BackSide
    });
    const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
    walls.position.y = 6;
    this.scene.add(walls);

    // Create archways
    this.createArchways();
  }

  createArchways() {
    const archPositions = [
      { x: 0, z: -10, rotation: 0 }, // North
      { x: 0, z: 10, rotation: Math.PI }, // South
      { x: -10, z: 0, rotation: -Math.PI / 2 }, // West
      { x: 10, z: 0, rotation: Math.PI / 2 } // East
    ];

    archPositions.forEach(pos => {
      const archway = this.createArchway();
      archway.position.set(pos.x, 0, pos.z);
      archway.rotation.y = pos.rotation;
      this.scene.add(archway);
    });
  }

  createArchway() {
    const group = new THREE.Group();
    
    // Arch frame
    const archShape = new THREE.Shape();
    archShape.moveTo(-2, 0);
    archShape.lineTo(-2, 4);
    archShape.quadraticCurveTo(-2, 6, 0, 6);
    archShape.quadraticCurveTo(2, 6, 2, 4);
    archShape.lineTo(2, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 1,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.2,
      bevelSegments: 3
    };

    const archGeometry = new THREE.ExtrudeGeometry(archShape, extrudeSettings);
    const archMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.4,
      roughness: 0.6
    });
    
    const arch = new THREE.Mesh(archGeometry, archMaterial);
    group.add(arch);

    return group;
  }

  createCeiling() {
    const ceilingGeometry = new THREE.PlaneGeometry(20, 20, 20, 20);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2B48C,
      metalness: 0.3,
      roughness: 0.7,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 12;
    this.scene.add(ceiling);

    // Add chandelier
    this.createChandelier();
  }

  createChandelier() {
    const chandelier = new THREE.Group();
    
    // Central piece
    const centerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 1,
      roughness: 0.2
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    chandelier.add(center);

    // Light sources
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 1;

      const light = new THREE.PointLight(0xFFD700, 0.5, 10);
      light.position.x = Math.cos(angle) * radius;
      light.position.z = Math.sin(angle) * radius;
      light.position.y = -0.5;
      chandelier.add(light);

      // Decorative bulb
      const bulbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const bulbMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFF00,
        emissiveIntensity: 0.5
      });
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
      bulb.position.copy(light.position);
      chandelier.add(bulb);
    }

    chandelier.position.y = 11;
    this.scene.add(chandelier);
  }

  addDecorativeElements() {
    // Add pillars
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 8;
      
      const pillarGeometry = new THREE.CylinderGeometry(0.4, 0.5, 12, 8);
      const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0xD2B48C,
        metalness: 0.4,
        roughness: 0.6
      });
      
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(
        Math.cos(angle) * radius,
        6,
        Math.sin(angle) * radius
      );
      this.scene.add(pillar);

      // Add pillar capitals
      const capitalGeometry = new THREE.BoxGeometry(1, 0.5, 1);
      const capital = new THREE.Mesh(capitalGeometry, pillarMaterial);
      capital.position.set(
        Math.cos(angle) * radius,
        11.75,
        Math.sin(angle) * radius
      );
      this.scene.add(capital);
    }
  }

  createAudioPath() {
    this.pathPoints = [];
    const pathLength = 64;
    
    // Create a spiral path
    for (let i = 0; i < pathLength; i++) {
      const t = i / pathLength;
      const angle = t * Math.PI * 4; // 2 complete spirals
      const radius = 8 - (t * 6); // Spiral inwards
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.pathPoints.push(new THREE.Vector3(x, 0.5, z));
    }

    // Create path segments
    this.pathSegments = [];
    for (let i = 0; i < pathLength - 1; i++) {
      const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
      const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.8
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
    
    // Update path segments based on audio data
    for (let i = 0; i < this.pathSegments.length; i++) {
      const value = this.dataArray[i] || 0;
      const intensity = value / 255;
      
      const segment = this.pathSegments[i];
      segment.position.y = 0.5 + intensity * 1.5;
      segment.material.emissiveIntensity = intensity;
      segment.scale.y = 1 + intensity * 2;
      
      // Color gradient based on intensity
      const hue = 0.6 - intensity * 0.6; // Blue to red
      segment.material.color.setHSL(hue, 1, 0.5);
      segment.material.emissive.setHSL(hue, 1, 0.5);
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