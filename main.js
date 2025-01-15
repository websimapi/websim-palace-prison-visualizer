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
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
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
    const mazeSize = 7; // Increased size for more complexity
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
      [x, z - 1, 'north'], [x, z + 1, 'south'],
      [x + 1, z, 'east'], [x - 1, z, 'west']
    ];

    for (const [newX, newZ] of directions) {
      if (this.isValidCell(newX, newZ) && !this.mazeData[newX][newZ].visited) {
        neighbors.push([newX, newZ]);
      }
    }
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

  createRoom(size, wallThickness, x, z, roomData) {
    const room = new THREE.Group();

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide
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
        room.add(leftWall);

        // Right wall segment
        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(
          wall.position[0] + (wall.rotation ? doorWidth / 2 + (size - doorWidth) / 4 : 0),
          wall.position[1] + size / 2,
          wall.position[2] + (!wall.rotation ? doorWidth / 2 + (size - doorWidth) / 4 : 0)
        );
        rightWall.rotation.y = wall.rotation;
        room.add(rightWall);

        // Top of doorway
        const topGeometry = new THREE.BoxGeometry(doorWidth, size - doorHeight, wallThickness);
        const topWall = new THREE.Mesh(topGeometry, wallMaterial);
        topWall.position.set(
          wall.position[0],
          wall.position[1] + size - (size - doorHeight) / 2,
          wall.position[2]
        );
        topWall.rotation.y = wall.rotation;
        room.add(topWall);
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
        room.add(fullWall);
      }
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

    this.validPath = this.findPathToExit(startX, startZ);

    this.worldPath = this.validPath.map(([x, z]) => {
      return new THREE.Vector3(
        (x - Math.floor(mazeSize / 2)) * this.roomSize,
        2,
        (z - Math.floor(mazeSize / 2)) * this.roomSize
      );
    });
  }

  findPathToExit(startX, startZ) {
    const mazeSize = this.mazeData.length;
    const goal = this.findExitPoint(startX, startZ);
    const openSet = [[startX, startZ]];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(`${startX},${startZ}`, 0);
    fScore.set(`${startX},${startZ}`, this.heuristic([startX, startZ], goal));

    while (openSet.length > 0) {
      const current = this.getLowestFScore(openSet, fScore);
      if (!current) break; // Prevent error if openSet becomes empty

      if (current[0] === goal[0] && current[1] === goal[1]) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.splice(openSet.indexOf(current), 1);
      closedSet.add(`${current[0]},${current[1]}`);

      const neighbors = this.getValidNeighbors(current[0], current[1]);
      for (const neighbor of neighbors) {
        if (closedSet.has(`${neighbor[0]},${neighbor[1]}`)) continue;

        const tentativeGScore = gScore.get(`${current[0]},${current[1]}`) + 1;

        if (!openSet.find(([x, z]) => x === neighbor[0] && z === neighbor[1])) {
          openSet.push(neighbor);
        } else if (tentativeGScore >= (gScore.get(`${neighbor[0]},${neighbor[1]}`) || Infinity)) {
          continue;
        }

        cameFrom.set(`${neighbor[0]},${neighbor[1]}`, current);
        gScore.set(`${neighbor[0]},${neighbor[1]}`, tentativeGScore);
        fScore.set(`${neighbor[0]},${neighbor[1]}`,
          tentativeGScore + this.heuristic(neighbor, goal));
      }
    }

    return null;
  }

  findExitPoint(startX, startZ) {
    const mazeSize = this.mazeData.length;
    let exits = [];

    for (let i = 0; i < mazeSize; i++) {
      if (this.mazeData[i][0].north) exits.push([i, 0]);
      if (this.mazeData[i][mazeSize - 1].south) exits.push([i, mazeSize - 1]);
      if (this.mazeData[0][i].west) exits.push([0, i]);
      if (this.mazeData[mazeSize - 1][i].east) exits.push([mazeSize - 1, i]);
    }

    if (exits.length === 0) {
      const exitCandidates = [];
      for (let x = 0; x < mazeSize; x++) {
        for (let z = 0; z < mazeSize; z++) {
          if (x === 0) exitCandidates.push([x, z]);
          if (x === mazeSize - 1) exitCandidates.push([x, z]);
          if (z === 0) exitCandidates.push([x, z]);
          if (z === mazeSize - 1) exitCandidates.push([x, z]);
        }
      }

      // Pick the exit furthest from the start
      exits = exitCandidates.sort((a, b) => {
        const distA = Math.abs(a[0] - startX) + Math.abs(a[1] - startZ);
        const distB = Math.abs(b[0] - startX) + Math.abs(b[1] - startZ);
        return distB - distA;
      })[0];
      this.createExitPassage(exits[0], exits[1]);
      return exits;

    }

    return exits.reduce((closest, exit) => {
      const currentDist = Math.abs(exit[0] - startX) + Math.abs(exit[1] - startZ);
      const closestDist = Math.abs(closest[0] - startX) + Math.abs(closest[1] - startZ);
      return currentDist > closestDist ? exit : closest; // Changed to find furthest exit
    });
  }

  createExitPassage(x, z) {
    const mazeSize = this.mazeData.length;
    if (x === 0) this.mazeData[x][z].west = true;
    else if (x === mazeSize - 1) this.mazeData[x][z].east = true;
    else if (z === 0) this.mazeData[x][z].north = true;
    else if (z === mazeSize - 1) this.mazeData[x][z].south = true;
  }

  heuristic(pos, goal) {
    return Math.abs(pos[0] - goal[0]) + Math.abs(pos[1] - goal[1]);
  }

  getLowestFScore(openSet, fScore) {
    if (openSet.length === 0) return undefined;
    return openSet.reduce((lowest, current) => {
      const currentScore = fScore.get(`${current[0]},${current[1]}`) || Infinity;
      const lowestScore = fScore.get(`${lowest[0]},${lowest[1]}`) || Infinity;
      return currentScore < lowestScore ? current : lowest;
    });
  }

  reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(`${current[0]},${current[1]}`)) {
      current = cameFrom.get(`${current[0]},${current[1]}`);
      path.unshift(current);
    }
    return path;
  }

  getValidNeighbors(x, z) {
    const neighbors = [];
    if (this.mazeData[x][z].north && z > 0) neighbors.push([x, z - 1]);
    if (this.mazeData[x][z].south && z < this.mazeData.length - 1) neighbors.push([x, z + 1]);
    if (this.mazeData[x][z].east && x < this.mazeData.length - 1) neighbors.push([x + 1, z]);
    if (this.mazeData[x][z].west && x > 0) neighbors.push([x - 1, z]);
    return neighbors;
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

    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const currentPoint = this.pathPoints[i];
      const nextPoint = this.pathPoints[i + 1];

      // Direction vector from current to next point
      const direction = new THREE.Vector3().subVectors(nextPoint, currentPoint).normalize();

      // Offset the camera position slightly behind the current point along the direction vector
      const cameraPosition = currentPoint
        .clone()
        .add(direction.clone().multiplyScalar(-2))
        .setY(2);

      this.cameraPath.push({
        position: cameraPosition,
        lookAt: nextPoint.clone().setY(2),
      });
    }

    // Add the last point
    const lastPoint = this.pathPoints[this.pathPoints.length - 1];
    const cameraPosition = lastPoint.clone().setY(2);
    this.cameraPath.push({
      position: cameraPosition,
      lookAt: lastPoint.clone().add(new THREE.Vector3(0, 0, 1)).setY(2),
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
        const roomHalfSize = new THREE.Vector3(halfRoomSize, this.roomSize / 2, halfRoomSize);
        const box = new THREE.Box3().setFromCenterAndSize(roomCenter, roomHalfSize);

        if (box.containsPoint(position)) {
          const mazeX = x;
          const mazeZ = z;

          const localX = position.x - roomWorldX;
          const localZ = position.z - roomWorldZ;

          const tolerance = 0.5;

          if (localX > halfRoomSize - tolerance && !this.mazeData[mazeX][mazeZ].east) return true;
          if (localX < -halfRoomSize + tolerance && !this.mazeData[mazeX][mazeZ].west) return true;
          if (localZ > halfRoomSize - tolerance && !this.mazeData[mazeX][mazeZ].south) return true;
          if (localZ < -halfRoomSize + tolerance && !this.mazeData[mazeX][mazeZ].north) return true;
        }
      }
    }
    return false;
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
    this.audio.addEventListener('loadedmetadata', () => {
      this.animationDuration = this.audio.duration * 0.95; // slightly before the end
    });
  }

  updateAudioData() {
    this.analyser.getByteFrequencyData(this.dataArray);

    for (let i = 0; i < this.pathSegments.length; i++) {
      const value = this.dataArray[i] || 0;
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
    // ...existing code...
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
      const progress = this.audio.currentTime / this.animationDuration;
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