import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class AudioVisualizer {
  constructor() {
    this.setupLoadingScreen();
  }

  setupLoadingScreen() {
    this.startButton = document.getElementById('startButton');
    this.loadingScreen = document.getElementById('loading-screen');
    this.progressBar = document.querySelector('.progress-bar');
    this.container = document.getElementById('container');
    this.audioControls = document.getElementById('audio-controls');

    this.startButton.addEventListener('click', () => this.initializeExperience());
  }

  async initializeExperience() {
    this.startButton.style.display = 'none';
    await this.loadResources();
    this.setup();
    this.createScene();
    this.setupAudio();
    this.setupCameraPath();
    this.animate();
    
    // Fade out loading screen and fade in experience
    this.loadingScreen.style.opacity = 0;
    this.container.style.opacity = 1;
    this.audioControls.style.opacity = 1;
    
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 1000);
  }

  async loadResources() {
    // Simulate loading resources
    const totalSteps = 100;
    for (let i = 0; i < totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      this.progressBar.style.width = `${(i + 1) / totalSteps * 100}%`;
    }
  }

  setup() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    // Initial camera position (center room)
    this.camera.position.set(0, 2, 0);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createScene() {
    this.createMaze();
    this.createAudioPath();
  }

  createMaze() {
    // Create maze layout
    this.rooms = [];
    const mazeSize = 5; // 5x5 grid of rooms
    const roomSize = 10;
    const wallThickness = 0.5;

    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        const posX = (x - Math.floor(mazeSize/2)) * roomSize;
        const posZ = (z - Math.floor(mazeSize/2)) * roomSize;
        
        const room = this.createRoom(roomSize, wallThickness, posX, posZ);
        this.rooms.push(room);
        this.scene.add(room);
      }
    }

    // Add connecting corridors
    this.createCorridors(mazeSize, roomSize);
  }

  createRoom(size, wallThickness, x, z) {
    const room = new THREE.Group();
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.3,
      roughness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    room.add(floor);

    // Ceiling
    const ceiling = floor.clone();
    ceiling.position.y = size;
    room.add(ceiling);

    // Walls
    const wallGeometry = new THREE.BoxGeometry(size, size, wallThickness);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2B48C,
      metalness: 0.2,
      roughness: 0.8,
    });

    // North wall
    const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
    northWall.position.z = -size/2;
    northWall.position.y = size/2;
    room.add(northWall);

    // South wall
    const southWall = northWall.clone();
    southWall.position.z = size/2;
    room.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
    eastWall.rotation.y = Math.PI/2;
    eastWall.position.x = size/2;
    eastWall.position.y = size/2;
    room.add(eastWall);

    // West wall
    const westWall = eastWall.clone();
    westWall.position.x = -size/2;
    room.add(westWall);

    room.position.set(x, 0, z);
    return room;
  }

  createCorridors(mazeSize, roomSize) {
    // Create a simple maze pattern connecting rooms
    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        if (Math.random() > 0.3) {
          if (x < mazeSize - 1) this.connectRooms(x, z, x + 1, z, mazeSize, roomSize);
        }
        if (Math.random() > 0.3) {
          if (z < mazeSize - 1) this.connectRooms(x, z, x, z + 1, mazeSize, roomSize);
        }
      }
    }
  }

  connectRooms(x1, z1, x2, z2, mazeSize, roomSize) {
    const corridor = new THREE.Group();
    const corridorWidth = 3;
    const corridorHeight = 4;
    
    const geometry = new THREE.BoxGeometry(
      x1 === x2 ? corridorWidth : roomSize,
      corridorHeight,
      z1 === z2 ? corridorWidth : roomSize
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: 0xD2B48C,
      metalness: 0.2,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    const corridor_mesh = new THREE.Mesh(geometry, material);
    corridor.add(corridor_mesh);

    const posX = (x1 - Math.floor(mazeSize/2)) * roomSize;
    const posZ = (z1 - Math.floor(mazeSize/2)) * roomSize;
    
    corridor.position.set(posX, corridorHeight/2, posZ);
    this.scene.add(corridor);
  }

  setupCameraPath() {
    // Create camera waypoints through the maze
    this.cameraWaypoints = [
      new THREE.Vector3(0, 2, 0), // Start in center
      new THREE.Vector3(10, 2, 0),
      new THREE.Vector3(10, 2, 10),
      new THREE.Vector3(0, 2, 10),
      new THREE.Vector3(-10, 2, 10),
      new THREE.Vector3(-10, 2, 0),
      new THREE.Vector3(-10, 2, -10),
      new THREE.Vector3(0, 2, -10),
      new THREE.Vector3(10, 2, -10)
    ];

    this.currentWaypoint = 0;
    this.waypointTransition = 0;
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
    
    if (this.analyser) {
      this.updateAudioData();
    }
    
    // Update camera position along path
    if (this.audio && !this.audio.paused) {
      this.waypointTransition += 0.001;
      if (this.waypointTransition >= 1) {
        this.waypointTransition = 0;
        this.currentWaypoint = (this.currentWaypoint + 1) % this.cameraWaypoints.length;
      }

      const current = this.cameraWaypoints[this.currentWaypoint];
      const next = this.cameraWaypoints[(this.currentWaypoint + 1) % this.cameraWaypoints.length];
      
      this.camera.position.lerpVectors(current, next, this.waypointTransition);
      this.camera.lookAt(0, 2, 0);
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the visualizer
new AudioVisualizer();