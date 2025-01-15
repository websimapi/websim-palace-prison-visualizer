import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class AudioVisualizer {
  constructor() {
    this.setupLoadingScreen();
    this.mazeData = null;
    this.roomSize = 10;
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
    await this.setupAudio();
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

    // Load textures for wall paintings and decorations
    await this.loadTextures();
  }

  async loadTextures() {
    // Generate procedural textures
    this.textures = {};

    const generateCanvasTexture = (drawFunction) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      drawFunction(context, canvas);
      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };

    // Example wall painting texture
    this.textures.wallPainting = generateCanvasTexture((ctx, canvas) => {
      // Draw an abstract pattern
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 100; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          Math.random() * 50,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });

    // Example decorative floor texture
    this.textures.decorative = generateCanvasTexture((ctx, canvas) => {
      ctx.fillStyle = '#555';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(
          canvas.width / 2,
          canvas.height / 2,
          i * 20,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    });
  }

  setup() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // Controls - disable for automated camera
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;

    // Initial camera position (center room)
    this.camera.position.set(0, 2, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x808080);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1);
    this.scene.add(directionalLight);

    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createScene() {
    this.generateMazeData();
    this.createMaze();
    this.findValidPaths();
    this.createAudioPath();
    this.generateValidCameraPath();
  }

  generateMazeData() {
    const mazeSize = 11; // Increased size for more complexity
    this.mazeData = Array(mazeSize).fill().map(() =>
      Array(mazeSize).fill().map(() => ({
        north: false,
        south: false,
        east: false,
        west: false,
        visited: false
      }))
    );

    // Depth-first search maze generation
    const stack = [];
    const startX = Math.floor(mazeSize / 2);
    const startZ = Math.floor(mazeSize / 2);

    this.mazeData[startX][startZ].visited = true;
    stack.push([startX, startZ]);

    while (stack.length > 0) {
      const [currentX, currentZ] = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(currentX, currentZ);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const [nextX, nextZ] = neighbors[Math.floor(Math.random() * neighbors.length)];
      this.createPassage(currentX, currentZ, nextX, nextZ);

      this.mazeData[nextX][nextZ].visited = true;
      stack.push([nextX, nextZ]);
    }

    this.ensureValidExit(startX, startZ);
  }

  getUnvisitedNeighbors(x, z) {
    const neighbors = [];
    const directions = [
      [x, z - 1], // North
      [x, z + 1], // South
      [x + 1, z], // East
      [x - 1, z]  // West
    ];

    directions.forEach(([nx, nz]) => {
      if (this.isValidCell(nx, nz) && !this.mazeData[nx][nz].visited) {
        neighbors.push([nx, nz]);
      }
    });
    return neighbors;
  }

  isValidCell(x, z) {
    return x >= 0 && x < this.mazeData.length && z >= 0 && z < this.mazeData.length;
  }

  createPassage(x1, z1, x2, z2) {
    if (x2 > x1) {
      this.mazeData[x1][z1].east = true;
      this.mazeData[x2][z2].west = true;
    } else if (x2 < x1) {
      this.mazeData[x1][z1].west = true;
      this.mazeData[x2][z2].east = true;
    } else if (z2 > z1) {
      this.mazeData[x1][z1].south = true;
      this.mazeData[x2][z2].north = true;
    } else if (z2 < z1) {
      this.mazeData[x1][z1].north = true;
      this.mazeData[x2][z2].south = true;
    }
  }

  ensureValidExit(startX, startZ) {
    const mazeSize = this.mazeData.length;
    const visited = new Set();
    const stack = [[startX, startZ]];

    while (stack.length > 0) {
      const [x, z] = stack.pop();
      const key = `${x},${z}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (x === 0 || x === mazeSize - 1 || z === 0 || z === mazeSize - 1) {
        return; // Exit already exists or is reachable
      }

      const neighbors = this.getValidNeighbors(x, z);
      for (const neighbor of neighbors) {
        if (!visited.has(`${neighbor[0]},${neighbor[1]}`)) {
          stack.push(neighbor);
        }
      }
    }

    // If no exit found, create one at the boundary furthest from start
    let furthestPoint = [startX, startZ];
    let maxDistance = 0;
    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        if (x === 0 || x === mazeSize - 1 || z === 0 || z === mazeSize - 1) {
          const distance = Math.abs(x - startX) + Math.abs(z - startZ);
          if (distance > maxDistance) {
            maxDistance = distance;
            furthestPoint = [x, z];
          }
        }
      }
    }
    this.createExitPassage(furthestPoint[0], furthestPoint[1]);
  }

  createExitPassage(x, z) {
    const mazeSize = this.mazeData.length;
    if (x === 0) this.mazeData[x][z].west = true;
    else if (x === mazeSize - 1) this.mazeData[x][z].east = true;
    else if (z === 0) this.mazeData[x][z].north = true;
    else if (z === mazeSize - 1) this.mazeData[x][z].south = true;
  }

  createRoom(size, wallThickness, x, z, roomData) {
    const room = new THREE.Group();

    // Floor with decorative texture
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide,
      map: this.textures.decorative,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01; // prevent z-fighting
    room.add(floor);

    // Ceiling
    const ceiling = floor.clone();
    ceiling.position.y = size;
    room.add(ceiling);

    const doorWidth = 3;
    const doorHeight = 6;

    // Create walls with doorways based on roomData
    const walls = [
      { direction: 'north', rotation: 0, position: [0, 0, -size / 2], hasDoor: roomData.north },
      { direction: 'south', rotation: 0, position: [0, 0, size / 2], hasDoor: roomData.south },
      { direction: 'east', rotation: Math.PI / 2, position: [size / 2, 0, 0], hasDoor: roomData.east },
      { direction: 'west', rotation: Math.PI / 2, position: [-size / 2, 0, 0], hasDoor: roomData.west }
    ];

    walls.forEach(wall => {
      const wallGroup = new THREE.Group();

      if (wall.hasDoor) {
        // Create wall segments around door
        const sideWallGeometry = new THREE.BoxGeometry((size - doorWidth) / 2, size, wallThickness);
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: 0xD2B48C,
          metalness: 0.2,
          roughness: 0.8
        });

        // Left wall segment
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.position.set(
          wall.position[0] - (wall.rotation ? doorWidth / 2 + (size - doorWidth) / 4 : 0),
          wall.position[1] + size / 2,
          wall.position[2] - (!wall.rotation ? doorWidth / 2 + (size - doorWidth) / 4 : 0)
        );
        leftWall.rotation.y = wall.rotation;
        wallGroup.add(leftWall);

        // Right wall segment
        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(
          wall.position[0] + (wall.rotation ? doorWidth / 2 + (size - doorWidth) / 4 : 0),
          wall.position[1] + size / 2,
          wall.position[2] + (!wall.rotation ? doorWidth / 2 + (size - doorWidth) / 4 : 0)
        );
        rightWall.rotation.y = wall.rotation;
        wallGroup.add(rightWall);

        // Top of doorway
        const topGeometry = new THREE.BoxGeometry(doorWidth, size - doorHeight, wallThickness);
        const topWall = new THREE.Mesh(topGeometry, wallMaterial);
        topWall.position.set(
          wall.position[0],
          wall.position[1] + size - (size - doorHeight) / 2,
          wall.position[2]
        );
        topWall.rotation.y = wall.rotation;
        wallGroup.add(topWall);
      } else {
        // Full wall if no door
        const wallGeometry = new THREE.BoxGeometry(size, size, wallThickness);
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: 0xD2B48C,
          metalness: 0.2,
          roughness: 0.8
        });
        const fullWall = new THREE.Mesh(wallGeometry, wallMaterial);
        fullWall.position.set(
          wall.position[0],
          wall.position[1] + size / 2,
          wall.position[2]
        );
        fullWall.rotation.y = wall.rotation;
        wallGroup.add(fullWall);
      }

      // Add paintings to walls
      if (!wall.hasDoor) {
        const paintingGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
        const paintingMaterial = new THREE.MeshStandardMaterial({
          map: this.textures.wallPainting,
          side: THREE.DoubleSide
        });
        const painting = new THREE.Mesh(paintingGeometry, paintingMaterial);
        painting.rotation.y = wall.rotation;
        painting.position.set(
          wall.position[0],
          wall.position[1] + doorHeight / 2 + 1,
          wall.position[2] + (wall.rotation === 0 ? wallThickness / 2 + 0.01 : 0)
        );
        if (wall.rotation !== 0) {
          painting.position.set(
            wall.position[0] + (wall.rotation === Math.PI / 2 ? wallThickness / 2 + 0.01 : 0),
            wall.position[1] + doorHeight / 2 + 1,
            wall.position[2]
          );
        }
        wallGroup.add(painting);
      }

      room.add(wallGroup);
    });

    // Add columns at corners
    const columnGeometry = new THREE.CylinderGeometry(0.3, 0.3, size, 16);
    const columnMaterial = new THREE.MeshStandardMaterial({
      color: 0xAAAAAA,
      metalness: 0.5,
      roughness: 0.5
    });

    const corners = [
      [size / 2 - wallThickness / 2, size / 2, size / 2 - wallThickness / 2],
      [size / 2 - wallThickness / 2, size / 2, -size / 2 + wallThickness / 2],
      [-size / 2 + wallThickness / 2, size / 2, size / 2 - wallThickness / 2],
      [-size / 2 + wallThickness / 2, size / 2, -size / 2 + wallThickness / 2],
    ];

    corners.forEach(corner => {
      const column = new THREE.Mesh(columnGeometry, columnMaterial);
      column.position.set(corner[0], corner[1], corner[2]);
      room.add(column);
    });

    room.position.set(x, 0, z);
    return room;
  }

  createMaze() {
    this.rooms = [];
    const mazeSize = this.mazeData.length;
    const wallThickness = 0.5;

    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        const posX = (x - Math.floor(mazeSize / 2)) * this.roomSize;
        const posZ = (z - Math.floor(mazeSize / 2)) * this.roomSize;

        const room = this.createRoom(this.roomSize, wallThickness, posX, posZ, this.mazeData[x][z]);
        this.rooms.push(room);
        this.scene.add(room);
      }
    }
  }

  findValidPaths() {
    const mazeSize = this.mazeData.length;
    const startX = Math.floor(mazeSize / 2);
    const startZ = Math.floor(mazeSize / 2);

    // Find valid path to exit
    this.validPath = this.findPathToExit(startX, startZ);
    
    if (!this.validPath) {
      console.error('No valid path found - creating emergency exit');
      this.createEmergencyExit(startX, startZ);
      this.validPath = this.findPathToExit(startX, startZ);
    }

    // Convert maze coordinates to world coordinates
    this.worldPath = this.validPath.map(([x, z]) => {
      return new THREE.Vector3(
        (x - Math.floor(mazeSize / 2)) * this.roomSize,
        2,
        (z - Math.floor(mazeSize / 2)) * this.roomSize
      );
    });
  }

  createEmergencyExit(startX, startZ) {
    const mazeSize = this.mazeData.length;
    // Find furthest edge from start
    let maxDist = 0;
    let bestExit = null;
    
    for (let i = 0; i < mazeSize; i++) {
      const edges = [
        {x: 0, z: i},
        {x: mazeSize-1, z: i},
        {x: i, z: 0},
        {x: i, z: mazeSize-1}
      ];
      
      edges.forEach(edge => {
        const dist = Math.abs(edge.x - startX) + Math.abs(edge.z - startZ);
        if (dist > maxDist) {
          maxDist = dist;
          bestExit = edge;
        }
      });
    }

    if (bestExit) {
      // Create path to exit by carving through walls
      let currentX = startX;
      let currentZ = startZ;
      
      while (currentX !== bestExit.x || currentZ !== bestExit.z) {
        if (currentX < bestExit.x) {
          this.mazeData[currentX][currentZ].east = true;
          this.mazeData[currentX + 1][currentZ].west = true;
          currentX++;
        } else if (currentX > bestExit.x) {
          this.mazeData[currentX][currentZ].west = true;
          this.mazeData[currentX - 1][currentZ].east = true;
          currentX--;
        } else if (currentZ < bestExit.z) {
          this.mazeData[currentX][currentZ].south = true;
          this.mazeData[currentX][currentZ + 1].north = true;
          currentZ++;
        } else if (currentZ > bestExit.z) {
          this.mazeData[currentX][currentZ].north = true;
          this.mazeData[currentX][currentZ - 1].south = true;
          currentZ--;
        }
      }

      // Create final exit
      if (bestExit.x === 0) this.mazeData[bestExit.x][bestExit.z].west = true;
      else if (bestExit.x === mazeSize-1) this.mazeData[bestExit.x][bestExit.z].east = true;
      else if (bestExit.z === 0) this.mazeData[bestExit.x][bestExit.z].north = true;
      else if (bestExit.z === mazeSize-1) this.mazeData[bestExit.x][bestExit.z].south = true;
    }
  }

  findPathToExit(startX, startZ) {
    const queue = [[startX, startZ]];
    const visited = new Set(`${startX},${startZ}`);
    const parent = new Map();
    const mazeSize = this.mazeData.length;
    let exitFound = null;

    while (queue.length > 0) {
      const [x, z] = queue.shift();
      
      // Check if this is an exit
      if (x === 0 || x === mazeSize-1 || z === 0 || z === mazeSize-1) {
        if (this.isValidExit(x, z)) {
          exitFound = [x, z];
          break;
        }
      }

      // Get valid neighbors
      const neighbors = this.getValidNeighbors(x, z);
      for (const [nextX, nextZ] of neighbors) {
        const key = `${nextX},${nextZ}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nextX, nextZ]);
          parent.set(key, [x, z]);
        }
      }
    }

    if (exitFound) {
      // Reconstruct path
      const path = [exitFound];
      let current = exitFound;
      while (current[0] !== startX || current[1] !== startZ) {
        const key = `${current[0]},${current[1]}`;
        current = parent.get(key);
        path.unshift(current);
      }
      return path;
    }

    return null;
  }

  isValidExit(x, z) {
    const mazeSize = this.mazeData.length;
    if (x === 0) return this.mazeData[x][z].west;
    if (x === mazeSize-1) return this.mazeData[x][z].east;
    if (z === 0) return this.mazeData[x][z].north;
    if (z === mazeSize-1) return this.mazeData[x][z].south;
    return false;
  }

  getValidNeighbors(x, z) {
    const neighbors = [];
    if (this.mazeData[x][z].north && z > 0) neighbors.push([x, z - 1]);
    if (this.mazeData[x][z].south && z < this.mazeData.length - 1) neighbors.push([x, z + 1]);
    if (this.mazeData[x][z].east && x < this.mazeData.length - 1) neighbors.push([x + 1, z]);
    if (this.mazeData[x][z].west && x > 0) neighbors.push([x - 1, z]);
    return neighbors;
  }

  createAudioPath() {
    this.pathPoints = [];

    for (let i = 0; i < this.worldPath.length; i++) {
      this.pathPoints.push(this.worldPath[i].clone().setY(2));
    }

    this.pathSegments = [];
    this.pathPoints.forEach((point, i) => {
      const geometry = new THREE.BoxGeometry(0.2, 0.1, 0.2);
      const material = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.8
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.copy(point);
      this.scene.add(segment);
      this.pathSegments.push(segment);
    });
  }

  generateValidCameraPath() {
    this.cameraPath = [];
    const pathLength = this.pathPoints.length;

    for (let i = 0; i < pathLength - 1; i++) {
      const currentPoint = this.pathPoints[i];
      const nextPoint = this.pathPoints[i + 1];
      const direction = new THREE.Vector3()
        .subVectors(nextPoint, currentPoint)
        .normalize();

      // Position camera slightly behind and above current point
      const cameraOffset = direction.clone()
        .multiplyScalar(-2) // Move camera behind current point
        .add(new THREE.Vector3(0, 1.5, 0)); // Lift camera up slightly
      
      const cameraPosition = currentPoint.clone().add(cameraOffset);

      // Ensure camera position doesn't clip through walls
      if (!this.checkWallCollision(cameraPosition)) {
        this.cameraPath.push({
          position: cameraPosition,
          lookAt: nextPoint.clone(),
        });
      }
    }

    // Add final camera position looking at exit
    const lastPoint = this.pathPoints[pathLength - 1];
    const secondLastPoint = this.pathPoints[pathLength - 2];
    const finalDirection = new THREE.Vector3()
      .subVectors(lastPoint, secondLastPoint)
      .normalize();
    
    const finalCameraPosition = lastPoint.clone()
      .add(finalDirection.clone().multiplyScalar(-2))
      .add(new THREE.Vector3(0, 1.5, 0));

    this.cameraPath.push({
      position: finalCameraPosition,
      lookAt: lastPoint.clone().add(finalDirection),
    });

    this.currentWaypoint = 0;
    this.waypointTransition = 0;
  }

  checkWallCollision(position) {
    const halfRoomSize = this.roomSize / 2;
    const mazeSize = this.mazeData.length;

    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        const roomWorldX = (x - Math.floor(mazeSize / 2)) * this.roomSize;
        const roomWorldZ = (z - Math.floor(mazeSize / 2)) * this.roomSize;

        const roomCenter = new THREE.Vector3(roomWorldX, this.roomSize / 2, roomWorldZ);
        const roomSizeVector = new THREE.Vector3(this.roomSize - 1, this.roomSize, this.roomSize - 1);
        const box = new THREE.Box3().setFromCenterAndSize(roomCenter, roomSizeVector);

        if (box.containsPoint(position)) {
          const mazeX = x;
          const mazeZ = z;

          const localX = position.x - roomWorldX;
          const localZ = position.z - roomWorldZ;

          const tolerance = halfRoomSize - 1;

          if (
            (localX > tolerance && !this.mazeData[mazeX][mazeZ].east) ||
            (localX < -tolerance && !this.mazeData[mazeX][mazeZ].west) ||
            (localZ > tolerance && !this.mazeData[mazeX][mazeZ].south) ||
            (localZ < -tolerance && !this.mazeData[mazeX][mazeZ].north)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  async setupAudio() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 128;

    this.audio = new Audio('/Bitwave Dreams - Locked Away - Sonauto.wav');
    await this.audio.play().catch(() => {});
    this.audio.pause();
    this.audio.currentTime = 0;

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
    this.audio.addEventListener('loadedmetadata', () => {
      this.animationDuration = this.audio.duration * 0.95; // slightly before the end
    });
  }

  updateAudioData() {
    this.analyser.getByteFrequencyData(this.dataArray);

    for (let i = 0; i < this.pathSegments.length; i++) {
      const value = this.dataArray[i % this.dataArray.length] || 0;
      const intensity = value / 255;

      const segment = this.pathSegments[i];
      segment.position.y = 0.5 + intensity * 1.5;
      segment.material.emissiveIntensity = intensity;
      segment.scale.y = 1 + intensity * 2;

      const hue = 0.6 - intensity * 0.6;
      segment.material.color.setHSL(hue, 1, 0.5);
      segment.material.emissive.setHSL(hue, 1, 0.5);
    }
  }

  setupCameraPath() {
    // Existing code
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.analyser) {
      this.updateAudioData();
    }

    if (
      this.audio &&
      !this.audio.paused &&
      this.cameraPath &&
      this.cameraPath.length > 1 &&
      this.animationDuration
    ) {
      const progress = (this.audio.currentTime / this.animationDuration);
      const totalWaypoints = this.cameraPath.length - 1;
      const currentWaypointIndex = Math.min(
        Math.floor(progress * totalWaypoints),
        totalWaypoints - 1
      );
      const nextWaypointIndex = currentWaypointIndex + 1;
      const waypointProgress = progress * totalWaypoints - currentWaypointIndex;

      const currentWaypoint = this.cameraPath[currentWaypointIndex];
      const nextWaypoint = this.cameraPath[nextWaypointIndex];

      if (currentWaypoint && nextWaypoint) {
        const newPos = new THREE.Vector3().lerpVectors(
          currentWaypoint.position,
          nextWaypoint.position,
          waypointProgress
        );

        const newLookAt = new THREE.Vector3().lerpVectors(
          currentWaypoint.lookAt,
          nextWaypoint.lookAt,
          waypointProgress
        );

        if (!this.checkWallCollision(newPos)) {
          this.camera.position.copy(newPos);
          this.camera.lookAt(newLookAt);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Initialize the visualizer
new AudioVisualizer();