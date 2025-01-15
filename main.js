import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class AudioVisualizer {
  constructor() {
    this.setupLoadingScreen();
    this.mazeData = null;
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
    this.generateMazeData();
    this.createMaze();
    this.findValidPaths();
    this.createAudioPath();
    this.generateValidCameraPath();
  }

  generateMazeData() {
    const mazeSize = 5;
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
    const startX = Math.floor(mazeSize/2);
    const startZ = Math.floor(mazeSize/2);
    
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

    // Ensure there's at least one valid path to an exit
    const exitCreated = this.ensureValidExit(startX, startZ);
    if (!exitCreated) {
      // If we couldn't create a path, regenerate the maze
      this.generateMazeData();
    }
  }

  getUnvisitedNeighbors(x, z) {
    const neighbors = [];
    const directions = [
      [x, z-1, 'north'], [x, z+1, 'south'],
      [x+1, z, 'east'], [x-1, z, 'west']
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
    floor.position.y = 0;
    room.add(floor);

    // Ceiling
    const ceiling = floor.clone();
    ceiling.position.y = size;
    room.add(ceiling);

    const doorWidth = 3;
    const doorHeight = 6;
    
    // Create walls with doorways based on roomData
    const walls = [
      { direction: 'north', rotation: 0, position: [0, 0, -size/2], hasDoor: roomData.north },
      { direction: 'south', rotation: 0, position: [0, 0, size/2], hasDoor: roomData.south },
      { direction: 'east', rotation: Math.PI/2, position: [size/2, 0, 0], hasDoor: roomData.east },
      { direction: 'west', rotation: Math.PI/2, position: [-size/2, 0, 0], hasDoor: roomData.west }
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
          wall.position[0] - (wall.rotation ? doorWidth/2 + (size-doorWidth)/4 : 0),
          wall.position[1] + size/2,
          wall.position[2] - (!wall.rotation ? doorWidth/2 + (size-doorWidth)/4 : 0)
        );
        leftWall.rotation.y = wall.rotation;
        room.add(leftWall);

        // Right wall segment
        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.position.set(
          wall.position[0] + (wall.rotation ? doorWidth/2 + (size-doorWidth)/4 : 0),
          wall.position[1] + size/2,
          wall.position[2] + (!wall.rotation ? doorWidth/2 + (size-doorWidth)/4 : 0)
        );
        rightWall.rotation.y = wall.rotation;
        room.add(rightWall);

        // Top of doorway
        const topGeometry = new THREE.BoxGeometry(doorWidth, size - doorHeight, wallThickness);
        const topWall = new THREE.Mesh(topGeometry, wallMaterial);
        topWall.position.set(
          wall.position[0],
          wall.position[1] + size - (size - doorHeight)/2,
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
          wall.position[1] + size/2,
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
    const roomSize = 10;
    const wallThickness = 0.5;

    for (let x = 0; x < mazeSize; x++) {
      for (let z = 0; z < mazeSize; z++) {
        const posX = (x - Math.floor(mazeSize/2)) * roomSize;
        const posZ = (z - Math.floor(mazeSize/2)) * roomSize;
        
        const room = this.createRoom(roomSize, wallThickness, posX, posZ, this.mazeData[x][z]);
        this.rooms.push(room);
        this.scene.add(room);
      }
    }
  }

  findValidPaths() {
    const mazeSize = this.mazeData.length;
    const startX = Math.floor(mazeSize/2);
    const startZ = Math.floor(mazeSize/2);
    
    // Find path using A* pathfinding
    this.validPath = this.findPathToExit(startX, startZ);
    
    // Convert maze coordinates to world coordinates
    this.worldPath = this.validPath.map(([x, z]) => {
      return new THREE.Vector3(
        (x - Math.floor(mazeSize/2)) * 10,
        2,
        (z - Math.floor(mazeSize/2)) * 10
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
    const exits = [];
    
    // Check all edge cells for valid exits
    for (let i = 0; i < mazeSize; i++) {
      if (this.mazeData[i][0].north) exits.push([i, 0]);
      if (this.mazeData[i][mazeSize-1].south) exits.push([i, mazeSize-1]);
      if (this.mazeData[0][i].west) exits.push([0, i]);
      if (this.mazeData[mazeSize-1][i].east) exits.push([mazeSize-1, i]);
    }
    
    // If no exits found, create one
    if (exits.length === 0) {
      // Create an exit on the furthest wall from start
      const exitX = startX < mazeSize/2 ? mazeSize-1 : 0;
      const exitZ = Math.floor(mazeSize/2);
      
      // Create the exit passage
      if (exitX === 0) {
        this.mazeData[exitX][exitZ].west = true;
      } else {
        this.mazeData[exitX][exitZ].east = true;
      }
      
      exits.push([exitX, exitZ]);
    }
    
    // Find closest exit
    return exits.reduce((closest, exit) => {
      const currentDist = Math.abs(exit[0] - startX) + Math.abs(exit[1] - startZ);
      const closestDist = Math.abs(closest[0] - startX) + Math.abs(closest[1] - startZ);
      return currentDist < closestDist ? exit : closest;
    }, exits[0]); // Provide initial value
  }

  heuristic(pos, goal) {
    return Math.abs(pos[0] - goal[0]) + Math.abs(pos[1] - goal[1]);
  }

  getLowestFScore(openSet, fScore) {
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
    if (this.mazeData[x][z].north && z > 0) neighbors.push([x, z-1]);
    if (this.mazeData[x][z].south && z < this.mazeData.length-1) neighbors.push([x, z+1]);
    if (this.mazeData[x][z].east && x < this.mazeData.length-1) neighbors.push([x+1, z]);
    if (this.mazeData[x][z].west && x > 0) neighbors.push([x-1, z]);
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
      
      // Check if we've reached an edge
      if (x === 0 || x === mazeSize-1 || z === 0 || z === mazeSize-1) {
        // Create an exit if there isn't one
        if (x === 0) this.mazeData[x][z].west = true;
        if (x === mazeSize-1) this.mazeData[x][z].east = true;
        if (z === 0) this.mazeData[x][z].north = true;
        if (z === mazeSize-1) this.mazeData[x][z].south = true;
        return true;
      }
      
      // Add unvisited neighbors to stack
      const neighbors = this.getValidNeighbors(x, z);
      for (const neighbor of neighbors) {
        if (!visited.has(`${neighbor[0]},${neighbor[1]}`)) {
          stack.push(neighbor);
        }
      }
    }
    
    return false;
  }

  createAudioPath() {
    this.pathPoints = [];
    this.pathSegments = [];
    
    // Create smooth interpolated path points
    for (let i = 0; i < this.worldPath.length - 1; i++) {
      const current = this.worldPath[i];
      const next = this.worldPath[i + 1];
      const numSubPoints = 16; // Increase number of points for smoother path
      
      const direction = new THREE.Vector3().subVectors(next, current);
      const distance = direction.length();
      const stepSize = distance / numSubPoints;
      
      for (let j = 0; j <= numSubPoints; j++) {
        const t = j / numSubPoints;
        const subPoint = new THREE.Vector3().lerpVectors(current, next, t);
        subPoint.y = 2; // Keep consistent height
        this.pathPoints.push(subPoint);
      }
    }

    // Create visual segments for the audio path
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
    this.pathLookAhead = 3; // Number of points to look ahead for smooth camera rotation
    
    // Create camera positions and target points
    for (let i = 0; i < this.pathPoints.length; i++) {
      const currentPoint = this.pathPoints[i];
      
      // Calculate look-at point (several points ahead for smooth rotation)
      const lookAheadIndex = Math.min(i + this.pathLookAhead, this.pathPoints.length - 1);
      const lookAtPoint = this.pathPoints[lookAheadIndex];
      
      // Calculate direction vector for camera offset
      const direction = new THREE.Vector3();
      if (i < this.pathPoints.length - 1) {
        direction.subVectors(this.pathPoints[i + 1], currentPoint).normalize();
      } else {
        direction.subVectors(currentPoint, this.pathPoints[i - 1]).normalize();
      }
      
      // Position camera behind the current point
      const cameraOffset = new THREE.Vector3()
        .copy(direction)
        .multiplyScalar(-3) // Distance behind the path
        .add(new THREE.Vector3(0, 1, 0)); // Slight height offset
      
      const cameraPos = new THREE.Vector3().addVectors(currentPoint, cameraOffset);
      
      // Check if camera position is valid (not inside walls)
      if (!this.checkWallCollision(cameraPos)) {
        this.cameraPath.push({
          position: cameraPos,
          lookAt: lookAtPoint
        });
      }
    }
    
    this.currentWaypoint = 0;
    this.waypointTransition = 0;
  }

  checkWallCollision(position) {
    // Cast rays in multiple directions to check for wall proximity
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    
    for (const direction of directions) {
      const raycaster = new THREE.Raycaster(position, direction, 0, 1.5); // Minimum distance from walls
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      
      for (const intersect of intersects) {
        if (intersect.object.geometry instanceof THREE.BoxGeometry && 
            intersect.object.geometry.parameters.height === 10) { // Wall height
          return true; // Collision detected
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

  setupCameraPath() {
    // Create camera waypoints through the maze
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.analyser) {
      this.updateAudioData();
    }
    
    // Camera movement along path
    if (this.audio && !this.audio.paused && this.cameraPath && this.cameraPath.length > 1) {
      this.waypointTransition += 0.002; // Adjust speed
      
      if (this.waypointTransition >= 1) {
        this.waypointTransition = 0;
        this.currentWaypoint = (this.currentWaypoint + 1) % (this.cameraPath.length - 1);
      }

      const current = this.cameraPath[this.currentWaypoint];
      const next = this.cameraPath[this.currentWaypoint + 1];
      
      if (current && next) {
        // Smooth camera position and rotation interpolation
        const newPos = new THREE.Vector3().lerpVectors(
          current.position,
          next.position,
          this.waypointTransition
        );
        
        const newLookAt = new THREE.Vector3().lerpVectors(
          current.lookAt,
          next.lookAt,
          this.waypointTransition
        );
        
        // Only update if no wall collision
        if (!this.checkWallCollision(newPos)) {
          this.camera.position.copy(newPos);
          this.camera.lookAt(newLookAt);
        }
      }
    }
    
    this.controls.update();
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