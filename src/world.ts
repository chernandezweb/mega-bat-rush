import * as THREE from 'three';
import {
  BossDef,
  GameSave,
  getEquippedItem,
  RivalChallenge,
  ShopItem,
  WALLS,
  WallDef,
} from './state';

export interface InteractiveProp {
  id: number;
  type: 'pad' | 'barrel' | 'ring' | 'taxi' | 'drone';
  mesh: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  radius: number;
  triggered: boolean;
  moveSpeed?: number;
  moveDir?: number;
  baseY?: number;
}

export interface WallVisual {
  def: WallDef;
  group: THREE.Group;
  signMesh: THREE.Mesh;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface Chunk {
  index: number;
  zStart: number;
  group: THREE.Group;
  props: InteractiveProp[];
}

export interface ArmRig {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
}

export interface LegRig {
  hip: THREE.Group;
  knee: THREE.Group;
}

export interface BaseballPlayerRig {
  root: THREE.Group;
  hips: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  torsoMesh: THREE.Mesh;
  leftArm: ArmRig;
  rightArm: ArmRig;
  leftLeg: LegRig;
  rightLeg: LegRig;
  helmetMount: THREE.Group;
  helmetMesh?: THREE.Group;
  swingPivot?: THREE.Group;
  batPivot?: THREE.Group;
  batMesh?: THREE.Group;
  material: THREE.MeshStandardMaterial;
}

const CHUNK_LEN = 40;
let propIdCounter = 1;

export class GameWorld {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public batter!: BaseballPlayerRig;
  public pitcher!: BaseballPlayerRig;
  public ball!: THREE.Mesh;
  public ballShadow!: THREE.Mesh;
  public targetRing!: THREE.Mesh;
  public shockwaveRing!: THREE.Mesh;
  public bestFlag!: THREE.Group;
  public rivalFlag!: THREE.Group;
  private wallVisuals: Map<string, WallVisual> = new Map();
  private pitcherAura!: THREE.Mesh;

  private skyMesh!: THREE.Mesh;
  private sunLight!: THREE.DirectionalLight;
  private chunks: Map<number, Chunk> = new Map();
  private particles: Particle[] = [];
  private trailNodes: THREE.Mesh[] = [];
  private trailHistory: THREE.Vector3[] = [];
  private buildingTextures: THREE.Texture[] = [];
  private buildingColors: number[] = [0xffffff, 0xdbeafe, 0xfef3c7, 0xfce7f3, 0xd1fae5, 0xe2e8f0];
  private signCache: Map<string, THREE.CanvasTexture> = new Map();

  private sharedGeo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
    sphere: new THREE.SphereGeometry(1, 14, 14),
    torus: new THREE.TorusGeometry(1.35, 0.22, 10, 22),
    pad: new THREE.CylinderGeometry(1.4, 1.6, 0.26, 18),
    barrel: new THREE.CylinderGeometry(0.62, 0.62, 1.4, 12),
  };

  private sharedMat = {
    walkway: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.88 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x52c44c, roughness: 0.9 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0xc89d6c, roughness: 0.95 }),
    chalk: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x2e8b3c, roughness: 0.85 }),
    benchWood: new THREE.MeshStandardMaterial({ color: 0xc9a36b, roughness: 0.75 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.45, metalness: 0.4 }),
    lampGlow: new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.7 }),
    padBase: new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.5, roughness: 0.2 }),
    padCore: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.8 }),
    barrelRed: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }),
    barrelBand: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.35 }),
    ringGold: new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.55, metalness: 0.65, roughness: 0.2 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x38a149, roughness: 0.85 }),
    gatePost: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
    shoe: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }),
    taxiYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.15 }),
    carRed: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.22, metalness: 0.25 }),
    carBlue: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.22, metalness: 0.25 }),
    taxiGlass: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.12, metalness: 0.55 }),
    tireBlack: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 }),
    rimSilver: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.7 }),
    headlight: new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 1.0 }),
    taillight: new THREE.MeshStandardMaterial({ color: 0xfca5a5, emissive: 0xef4444, emissiveIntensity: 0.9 }),
    dronePink: new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xdb2777, emissiveIntensity: 0.45, roughness: 0.25 }),
  };

  constructor(canvas: HTMLCanvasElement, save: GameSave) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x93c5fd, 85, 260);

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(56, w / h, 0.1, 420);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.loadStylizedTextures();
    this.setupLighting();
    this.createSkyDome();
    this.createFieldDetails();
    this.createCharacters(save);
    this.createBallAndFX(save);
    this.createBestFlag(save.bestDistance);
    this.createRivalFlag(null);
    this.createWalls(save);
    this.ensureChunksAround(0, !!save.activePowerups.superbounce);
  }

  public resize(): void {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x4ade80, 0.98);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.35);
    sun.position.set(16, 32, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 110;
    const d = 28;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sunLight = sun;
  }

  private createSkyDome(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const tile = 32;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const isEven = (x / tile + y / tile) % 2 === 0;
        ctx.fillStyle = isEven ? '#7db7f8' : '#b7d8fc';
        ctx.fillRect(x, y, tile, tile);
      }
    }
    const grad = ctx.createLinearGradient(0, 260, 0, 512);
    grad.addColorStop(0, 'rgba(224,242,254,0)');
    grad.addColorStop(0.65, 'rgba(224,242,254,0.65)');
    grad.addColorStop(1, 'rgba(240,249,255,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 260, 512, 252);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(6, 2);

    const skyGeo = new THREE.SphereGeometry(320, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyMesh);
  }

  private createFieldDetails(): void {
    // Home plate dirt circle & white pentagon home plate
    const homeDirt = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.04, 24), this.sharedMat.dirt);
    homeDirt.position.set(0, 0.02, 0.25);
    homeDirt.receiveShadow = true;
    this.scene.add(homeDirt);

    const homePlate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.55), this.sharedMat.chalk);
    homePlate.position.set(0.05, 0.045, 0.15);
    this.scene.add(homePlate);

    // Pitcher's mound dirt & pitching rubber at z = -14.5
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.3, 0.2, 22), this.sharedMat.dirt);
    mound.position.set(0.05, 0.08, -14.5);
    mound.receiveShadow = true;
    this.scene.add(mound);

    const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.2), this.sharedMat.chalk);
    rubber.position.set(0.05, 0.19, -14.55);
    this.scene.add(rubber);
  }

  private loadStylizedTextures(): void {
    const loader = new THREE.TextureLoader();

    // Seamless hand-painted cartoon grass turf
    const grassTex = loader.load('./textures/grass.jpg');
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(16, 7);
    grassTex.colorSpace = THREE.SRGBColorSpace;
    this.sharedMat.grass.map = grassTex;
    this.sharedMat.grass.color.setHex(0xffffff);
    this.sharedMat.grass.needsUpdate = true;

    // Seamless stylized concrete park sidewalk slabs
    const walkTex = loader.load('./textures/walkway.jpg');
    walkTex.wrapS = THREE.RepeatWrapping;
    walkTex.wrapT = THREE.RepeatWrapping;
    walkTex.repeat.set(2, 12);
    walkTex.colorSpace = THREE.SRGBColorSpace;
    this.sharedMat.walkway.map = walkTex;
    this.sharedMat.walkway.color.setHex(0xffffff);
    this.sharedMat.walkway.needsUpdate = true;

    // Seamless cartoon skyscraper glass facade
    const bldgTex = loader.load('./textures/building.jpg');
    bldgTex.wrapS = THREE.RepeatWrapping;
    bldgTex.wrapT = THREE.RepeatWrapping;
    bldgTex.repeat.set(1, 2);
    bldgTex.colorSpace = THREE.SRGBColorSpace;
    this.buildingTextures = [bldgTex];
  }

  private createBaseballPlayer(color: number, isPitcher: boolean, emissive = 0x000000): BaseballPlayerRig {
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: emissive ? 0.25 : 0,
      roughness: 0.34,
      metalness: 0.08,
    });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    const root = new THREE.Group();
    const hips = new THREE.Group();
    hips.position.set(0, 0.88, 0);
    root.add(hips);

    // Torso group (rotates independently for realistic hip-shoulder separation!)
    const torsoGroup = new THREE.Group();
    hips.add(torsoGroup);

    const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.46, 8, 14), mat);
    torsoMesh.position.set(0, 0.36, 0);
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    // Jersey belt & chest stripe so torso rotation is super readable!
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.08, 14), this.sharedMat.shoe);
    belt.position.set(0, 0.08, 0);
    torsoGroup.add(belt);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.58), accentMat);
    stripe.position.set(0, 0.38, 0);
    torsoGroup.add(stripe);

    // Head group + helmet mount
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.92, 0);
    torsoGroup.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 18), mat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    const helmetMount = new THREE.Group();
    headGroup.add(helmetMount);

    // Articulated Arm builder (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand)
    const buildArm = (side: -1 | 1): ArmRig => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.37, 0.58, 0);
      torsoGroup.add(shoulder);

      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.28, 6, 10), mat);
      upper.position.set(0, -0.18, 0);
      upper.castShadow = true;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.36, 0);
      shoulder.add(elbow);

      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.26, 6, 10), mat);
      forearm.position.set(0, -0.17, 0);
      forearm.castShadow = true;
      elbow.add(forearm);

      const hand = new THREE.Group();
      hand.position.set(0, -0.34, 0);
      elbow.add(hand);

      // Pitcher wears a big brown leather glove on left hand!
      if (isPitcher && side === -1) {
        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), this.sharedMat.glove);
        glove.scale.set(1.15, 1.25, 0.75);
        glove.castShadow = true;
        hand.add(glove);
      } else {
        const fist = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 10), accentMat);
        fist.castShadow = true;
        hand.add(fist);
      }

      return { shoulder, elbow, hand };
    };

    // Articulated Leg builder (Hip -> Thigh -> Knee -> Shin -> Cleat)
    const buildLeg = (side: -1 | 1): LegRig => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.16, 0, 0);
      hips.add(hip);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.3, 6, 10), mat);
      thigh.position.set(0, -0.2, 0);
      thigh.castShadow = true;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -0.42, 0);
      hip.add(knee);

      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 10), accentMat);
      shin.position.set(0, -0.2, 0);
      shin.castShadow = true;
      knee.add(shin);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.36), this.sharedMat.shoe);
      shoe.position.set(0, -0.4, 0.08);
      shoe.castShadow = true;
      knee.add(shoe);

      return { hip, knee };
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);
    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);

    return {
      root,
      hips,
      torsoGroup,
      headGroup,
      torsoMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      helmetMount,
      material: mat,
    };
  }

  private buildHelmetMesh(item: ShopItem): THREE.Group {
    const g = new THREE.Group();
    const primary = new THREE.MeshStandardMaterial({
      color: item.primaryColor,
      emissive: item.emissive || 0x000000,
      emissiveIntensity: item.emissive ? 0.45 : 0,
      roughness: 0.28,
      metalness: 0.25,
    });
    const secondary = new THREE.MeshStandardMaterial({
      color: item.secondaryColor ?? 0xffffff,
      emissive: item.emissive || 0x000000,
      emissiveIntensity: item.emissive ? 0.55 : 0,
      roughness: 0.3,
      metalness: 0.3,
    });

    const shape = item.shape || 'cap';

    if (shape === 'crown') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.35, 0.2, 16), primary);
      band.position.y = 0.26;
      g.add(band);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), primary);
        spike.position.set(Math.cos(angle) * 0.3, 0.44, Math.sin(angle) * 0.3);
        g.add(spike);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), secondary);
        gem.position.set(Math.cos(angle) * 0.35, 0.28, Math.sin(angle) * 0.35);
        g.add(gem);
      }
      return g;
    }

    if (shape === 'astro') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.47, 18, 16),
        new THREE.MeshStandardMaterial({
          color: item.secondaryColor ?? 0x38bdf8,
          transparent: true,
          opacity: 0.55,
          roughness: 0.1,
          metalness: 0.6,
        })
      );
      g.add(dome);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 8, 18), primary);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = -0.25;
      g.add(collar);
      return g;
    }

    // Standard dome base for cap / batting / viking / visor / mohawk
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.415, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      primary
    );
    dome.position.y = 0.04;
    dome.castShadow = true;
    g.add(dome);

    if (shape === 'cap' || shape === 'batting') {
      // Brim pointing forward (+Z)
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.055, 0.36), primary);
      brim.position.set(0, 0.12, 0.36);
      g.add(brim);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), secondary);
      stripe.position.set(0, 0.25, 0.35);
      g.add(stripe);

      if (shape === 'batting') {
        // Ear flap on left side facing pitcher
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.28), primary);
        flap.position.set(-0.39, -0.05, 0.05);
        g.add(flap);
      }
    } else if (shape === 'viking') {
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 10), secondary);
        horn.position.set(side * 0.42, 0.28, 0);
        horn.rotation.z = -side * 0.85;
        g.add(horn);
      }
    } else if (shape === 'visor') {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 0.26), secondary);
      visor.position.set(0, 0.06, 0.34);
      g.add(visor);
    } else if (shape === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 6), secondary);
        fin.position.set(0, 0.46 - Math.abs(i - 2) * 0.04, -0.24 + i * 0.13);
        fin.rotation.x = (i - 2) * 0.22;
        g.add(fin);
      }
    }

    return g;
  }

  private buildBatMesh(item: ShopItem): THREE.Group {
    const g = new THREE.Group();
    const gripMat = new THREE.MeshStandardMaterial({ color: item.secondaryColor ?? 0x222222, roughness: 0.7 });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: item.primaryColor,
      emissive: item.emissive || 0x000000,
      emissiveIntensity: item.emissive ? 0.55 : 0,
      roughness: 0.28,
      metalness: item.emissive || item.shape === 'alloy' ? 0.45 : 0.15,
    });

    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), gripMat);
    g.add(knob);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.58, 10), gripMat);
    handle.position.y = 0.31;
    handle.castShadow = true;
    g.add(handle);

    const shape = item.shape || 'classic';

    if (shape === 'hammer') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.9, 10), gripMat);
      shaft.position.y = 0.9;
      g.add(shaft);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.38, 0.38), barrelMat);
      head.position.y = 1.42;
      head.castShadow = true;
      g.add(head);
    } else if (shape === 'saber') {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.14, 12), gripMat);
      hilt.position.y = 0.6;
      g.add(hilt);
      const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.18, 12), barrelMat);
      blade.position.y = 1.24;
      g.add(blade);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), barrelMat);
      tip.position.y = 1.83;
      g.add(tip);
    } else if (shape === 'scepter') {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.95, 12), barrelMat);
      barrel.position.y = 1.05;
      barrel.castShadow = true;
      g.add(barrel);
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), barrelMat);
      orb.position.y = 1.65;
      g.add(orb);
    } else {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.06, 1.06, 12), barrelMat);
      barrel.position.y = 1.1;
      barrel.castShadow = true;
      g.add(barrel);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), barrelMat);
      cap.position.y = 1.63;
      g.add(cap);

      if (shape === 'mace') {
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 });
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 6), spikeMat);
            spike.position.set(Math.cos(a) * 0.14, 1.05 + r * 0.35, Math.sin(a) * 0.14);
            spike.rotation.z = -Math.cos(a) * 1.3;
            spike.rotation.x = Math.sin(a) * 1.3;
            g.add(spike);
          }
        }
      }
    }

    return g;
  }

  private createCharacters(save: GameSave): void {
    const skin = getEquippedItem(save, 'skins');
    this.batter = this.createBaseballPlayer(skin.primaryColor, false, skin.emissive || 0);
    // Right-handed batter standing to the left of home plate, facing sideways across the plate (+X)!
    this.batter.root.position.set(-1.1, 0, 0.35);
    this.batter.root.rotation.y = Math.PI * 0.48;
    this.scene.add(this.batter.root);

    // Attach swingPivot centered at chest so hands & bat whip in a true horizontal baseball arc!
    const swingPivot = new THREE.Group();
    swingPivot.position.set(0, 0.52, 0);
    this.batter.torsoGroup.add(swingPivot);
    this.batter.swingPivot = swingPivot;

    const batPivot = new THREE.Group();
    batPivot.position.set(-0.28, 0.02, 0.24);
    swingPivot.add(batPivot);
    this.batter.batPivot = batPivot;

    // Red pitcher standing on mound facing batter (+Z)
    this.pitcher = this.createBaseballPlayer(0xef233c, true);
    this.pitcher.root.position.set(0.05, 0.18, -14.5);
    this.pitcher.root.rotation.y = 0;
    // Give pitcher a classic red cap
    const pitcherCap = this.buildHelmetMesh({
      id: 'pitcher_cap',
      category: 'helmets',
      name: 'Cap',
      emoji: '🧢',
      desc: '',
      cost: 0,
      currency: 'coins',
      primaryColor: 0xb91c1c,
      secondaryColor: 0xffffff,
      shape: 'cap',
    });
    this.pitcher.helmetMount.add(pitcherCap);
    this.pitcher.helmetMesh = pitcherCap;

    // Glowing aura ring under pitcher when a Boss steps on the mound!
    this.pitcherAura = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.pitcherAura.rotation.x = -Math.PI / 2;
    this.pitcherAura.position.set(0.05, 0.23, -14.5);
    this.pitcherAura.visible = false;
    this.scene.add(this.pitcherAura);

    this.scene.add(this.pitcher.root);

    this.applyAppearance(save);
  }

  public setPitcherTheme(boss: BossDef | null): void {
    if (this.pitcher.helmetMesh) {
      this.pitcher.helmetMount.remove(this.pitcher.helmetMesh);
    }
    if (boss) {
      this.pitcher.material.color.setHex(boss.color);
      this.pitcher.material.emissive.setHex(boss.hatColor);
      this.pitcher.material.emissiveIntensity = 0.28;
      this.pitcher.root.scale.setScalar(1.16);
      const hat = this.buildHelmetMesh({
        id: 'boss_hat',
        category: 'helmets',
        name: boss.name,
        emoji: boss.emoji,
        desc: '',
        cost: 0,
        currency: 'coins',
        primaryColor: boss.hatColor,
        secondaryColor: 0xffffff,
        emissive: boss.hatColor,
        shape: boss.id === 'emperor' ? 'crown' : boss.id === 'phantom' ? 'visor' : 'mohawk',
      });
      this.pitcher.helmetMount.add(hat);
      this.pitcher.helmetMesh = hat;
      (this.pitcherAura.material as THREE.MeshBasicMaterial).color.setHex(boss.hatColor);
      this.pitcherAura.visible = true;
    } else {
      this.pitcher.material.color.setHex(0xef233c);
      this.pitcher.material.emissive.setHex(0x000000);
      this.pitcher.material.emissiveIntensity = 0;
      this.pitcher.root.scale.setScalar(1.0);
      const cap = this.buildHelmetMesh({
        id: 'pitcher_cap',
        category: 'helmets',
        name: 'Cap',
        emoji: '🧢',
        desc: '',
        cost: 0,
        currency: 'coins',
        primaryColor: 0xb91c1c,
        secondaryColor: 0xffffff,
        shape: 'cap',
      });
      this.pitcher.helmetMount.add(cap);
      this.pitcher.helmetMesh = cap;
      this.pitcherAura.visible = false;
    }
  }

  public getPitcherHandWorldPos(out: THREE.Vector3): THREE.Vector3 {
    this.pitcher.root.updateMatrixWorld(true);
    return this.pitcher.rightArm.hand.getWorldPosition(out);
  }

  public applyAppearance(save: GameSave): void {
    const skin = getEquippedItem(save, 'skins');
    this.batter.material.color.setHex(skin.primaryColor);
    this.batter.material.emissive.setHex(skin.emissive || 0x000000);
    this.batter.material.emissiveIntensity = skin.emissive ? 0.3 : 0;

    // Subtle muscle scaling
    const muscleBoost = 1 + Math.min(0.4, (save.muscleLevel - 1) * 0.018);
    this.batter.torsoMesh.scale.set(muscleBoost, 1 + (muscleBoost - 1) * 0.3, muscleBoost);
    this.batter.leftArm.shoulder.scale.setScalar(1 + (muscleBoost - 1) * 0.5);
    this.batter.rightArm.shoulder.scale.setScalar(1 + (muscleBoost - 1) * 0.5);

    // Helmet
    const helmetItem = getEquippedItem(save, 'helmets');
    if (this.batter.helmetMesh) {
      this.batter.helmetMount.remove(this.batter.helmetMesh);
    }
    const helmetMesh = this.buildHelmetMesh(helmetItem);
    this.batter.helmetMount.add(helmetMesh);
    this.batter.helmetMesh = helmetMesh;

    // Bat
    const batItem = getEquippedItem(save, 'bats');
    if (this.batter.batPivot) {
      if (this.batter.batMesh) {
        this.batter.batPivot.remove(this.batter.batMesh);
      }
      const mesh = this.buildBatMesh(batItem);
      const batScale = 1 + Math.min(0.24, (save.batLevel - 1) * 0.01);
      mesh.scale.setScalar(batScale);
      this.batter.batPivot.add(mesh);
      this.batter.batMesh = mesh;
    }

    // Trail color
    const trailItem = getEquippedItem(save, 'trails');
    for (const node of this.trailNodes) {
      (node.material as THREE.MeshBasicMaterial).color.setHex(trailItem.primaryColor);
    }
  }

  private createBallAndFX(save: GameSave): void {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(16, 64, 42, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(112, 64, 42, Math.PI - 0.9, Math.PI + 0.9);
    ctx.stroke();

    const ballTex = new THREE.CanvasTexture(c);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.35,
      metalness: 0.05,
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), ballMat);
    this.ball.castShadow = true;
    this.ball.visible = false;
    this.scene.add(this.ball);

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), shadowMat);
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.04;
    this.ballShadow.visible = false;
    this.scene.add(this.ballShadow);

    const ringGeo = new THREE.RingGeometry(0.52, 0.68, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    this.targetRing = new THREE.Mesh(ringGeo, ringMat);
    this.targetRing.position.set(0.05, 1.3, 0.1);
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);

    const shockGeo = new THREE.RingGeometry(0.4, 0.65, 28);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.shockwaveRing = new THREE.Mesh(shockGeo, shockMat);
    this.shockwaveRing.visible = false;
    this.scene.add(this.shockwaveRing);

    const trailItem = getEquippedItem(save, 'trails');
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(
        this.sharedGeo.sphere,
        new THREE.MeshBasicMaterial({
          color: trailItem.primaryColor,
          transparent: true,
          opacity: (1 - i / 18) * 0.65,
        })
      );
      m.visible = false;
      this.scene.add(m);
      this.trailNodes.push(m);
    }
  }

  private createBestFlag(bestDistance: number): void {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 5.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.7, roughness: 0.2 })
    );
    pole.position.set(3.2, 2.75, 0);
    g.add(pole);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.0, 0.14),
      new THREE.MeshStandardMaterial({
        map: this.getSignTexture('👑 BEST', '#f59e0b', '#ffffff'),
        emissive: 0xb45309,
        emissiveIntensity: 0.3,
      })
    );
    sign.position.set(3.2, 5.0, 0);
    g.add(sign);

    const line = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.08, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    line.position.set(0, 0.06, 0);
    g.add(line);

    this.bestFlag = g;
    this.updateBestFlag(bestDistance);
    this.scene.add(g);
  }

  public updateBestFlag(bestDistance: number): void {
    if (bestDistance >= 15) {
      this.bestFlag.visible = true;
      this.bestFlag.position.set(0, 0, -bestDistance);
    } else {
      this.bestFlag.visible = false;
    }
  }

  private createRivalFlag(rival: RivalChallenge | null): void {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 5.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.25 })
    );
    pole.position.set(-3.2, 2.9, 0);
    g.add(pole);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.05, 0.14),
      new THREE.MeshStandardMaterial({
        map: this.getSignTexture('🚩 RIVAL', '#dc2626', '#ffffff'),
        emissive: 0x991b1b,
        emissiveIntensity: 0.35,
      })
    );
    sign.position.set(-3.2, 5.2, 0);
    sign.name = 'rivalSign';
    g.add(sign);

    const line = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.09, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    line.position.set(0, 0.065, 0);
    g.add(line);

    this.rivalFlag = g;
    this.rivalFlag.visible = false;
    this.scene.add(g);
    if (rival) this.updateRivalFlag(rival);
  }

  public updateRivalFlag(rival: RivalChallenge | null): void {
    if (!rival) {
      this.rivalFlag.visible = false;
      return;
    }
    this.rivalFlag.visible = true;
    this.rivalFlag.position.set(0, 0, -rival.distance);
    const sign = this.rivalFlag.getObjectByName('rivalSign') as THREE.Mesh | undefined;
    if (sign) {
      (sign.material as THREE.MeshStandardMaterial).map = this.getSignTexture(
        `🚩 ${rival.name.toUpperCase()}`,
        '#dc2626',
        '#ffffff'
      );
      (sign.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  }

  private createWalls(save: GameSave): void {
    for (const def of WALLS) {
      const group = new THREE.Group();
      group.position.set(0, 0, -def.distance);

      // Left & right thick pillars
      const pillarMat = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.35, metalness: 0.3 });
      for (const side of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 10, 0.9), pillarMat);
        pillar.position.set(side * 3.5, 5, 0);
        pillar.castShadow = true;
        group.add(pillar);
      }

      // Breakable barrier panel across the walkway
      const panelMat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.22,
        transparent: true,
        opacity: 0.86,
        roughness: 0.25,
      });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(6.2, 8.8, 0.55), panelMat);
      panel.position.set(0, 4.4, 0);
      panel.castShadow = true;
      group.add(panel);

      // HP & Name banner on top
      const remHp = Math.max(0, def.maxHp - (save.wallDamage[def.id] || 0));
      const signMesh = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 1.45, 0.3),
        new THREE.MeshStandardMaterial({
          map: this.getSignTexture(`${def.name} ${remHp}HP`, '#dc2626', '#fef08a'),
        })
      );
      signMesh.position.set(0, 9.6, 0);
      group.add(signMesh);

      group.visible = !save.brokenWalls.includes(def.id);
      this.scene.add(group);
      this.wallVisuals.set(def.id, { def, group, signMesh });
    }
  }

  public syncWalls(save: GameSave): void {
    for (const [id, wv] of this.wallVisuals.entries()) {
      const broken = save.brokenWalls.includes(id);
      wv.group.visible = !broken;
      if (!broken) {
        const remHp = Math.max(1, wv.def.maxHp - (save.wallDamage[id] || 0));
        const mat = wv.signMesh.material as THREE.MeshStandardMaterial;
        mat.map = this.getSignTexture(`${wv.def.name} ${remHp}HP`, '#dc2626', '#fef08a');
        mat.needsUpdate = true;
      }
    }
  }

  private getSignTexture(label: string, bg: string, fg: string): THREE.CanvasTexture {
    const key = `${label}_${bg}_${fg}`;
    const cached = this.signCache.get(key);
    if (cached) return cached;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 88);
    ctx.fillStyle = fg;
    ctx.font = 'bold 46px "Lilita One", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 52);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.signCache.set(key, tex);
    return tex;
  }

  public getBiomeInfo(distance: number): { name: string; skyTint: number; grassColor: number; fogColor: number } {
    if (distance < 180) {
      return { name: 'CITY PARK', skyTint: 0xffffff, grassColor: 0xffffff, fogColor: 0x93c5fd };
    }
    if (distance < 420) {
      return { name: 'DOWNTOWN', skyTint: 0xdbeafe, grassColor: 0xd1fae5, fogColor: 0x7dd3fc };
    }
    if (distance < 800) {
      return { name: 'SUNSET BLVD', skyTint: 0xfdba74, grassColor: 0xfef08a, fogColor: 0xfb923c };
    }
    if (distance < 1500) {
      return { name: 'NEON STRIP', skyTint: 0xc084fc, grassColor: 0xc4b5fd, fogColor: 0x818cf8 };
    }
    return { name: 'COSMIC ZONE', skyTint: 0x38bdf8, grassColor: 0x818cf8, fogColor: 0x1e1b4b };
  }

  public updateBiomeVisuals(distance: number): void {
    const b = this.getBiomeInfo(distance);
    (this.skyMesh.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(b.skyTint), 0.05);
    this.sharedMat.grass.color.lerp(new THREE.Color(b.grassColor), 0.05);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.lerp(new THREE.Color(b.fogColor), 0.05);
    }
  }

  public clearChunks(): void {
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.group);
    }
    this.chunks.clear();
  }

  public ensureChunksAround(ballZ: number, extraPads = false): void {
    const centerIdx = Math.floor(-ballZ / CHUNK_LEN);
    const minIdx = Math.max(-1, centerIdx - 2);
    const maxIdx = centerIdx + 5;

    for (const [idx, chunk] of this.chunks.entries()) {
      if (idx < minIdx - 1 || idx > maxIdx + 2) {
        this.scene.remove(chunk.group);
        this.chunks.delete(idx);
      }
    }

    for (let idx = minIdx; idx <= maxIdx; idx++) {
      if (!this.chunks.has(idx)) {
        const chunk = this.buildChunk(idx, extraPads);
        this.chunks.set(idx, chunk);
        this.scene.add(chunk.group);
      }
    }
  }

  private buildChunk(index: number, extraPads: boolean): Chunk {
    const zStart = -index * CHUNK_LEN;
    const zCenter = zStart - CHUNK_LEN / 2;
    const group = new THREE.Group();
    const props: InteractiveProp[] = [];

    const walk = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.walkway);
    walk.scale.set(5.6, 0.2, CHUNK_LEN);
    walk.position.set(0, -0.1, zCenter);
    walk.receiveShadow = true;
    group.add(walk);

    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.curb);
      curb.scale.set(0.35, 0.26, CHUNK_LEN);
      curb.position.set(side * 2.95, -0.04, zCenter);
      curb.receiveShadow = true;
      group.add(curb);
    }

    const grass = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.grass);
    grass.scale.set(90, 0.2, CHUNK_LEN);
    grass.position.set(0, -0.15, zCenter);
    grass.receiveShadow = true;
    group.add(grass);

    const rand = (seed: number) => {
      const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 3; i++) {
      const pz = zStart - 6 - i * 13;
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(this.sharedGeo.cyl, this.sharedMat.darkMetal);
        pole.scale.set(0.11, 4.6, 0.11);
        pole.position.set(side * 3.45, 2.3, pz);
        pole.castShadow = true;
        group.add(pole);

        const lantern = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.lampGlow);
        lantern.scale.set(0.45, 0.55, 0.45);
        lantern.position.set(side * 3.45, 4.75, pz);
        group.add(lantern);

        if ((i + (side > 0 ? 1 : 0)) % 2 === 0) {
          const seat = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.benchWood);
          seat.scale.set(0.85, 0.12, 2.3);
          seat.position.set(side * 4.6, 0.55, pz - 4);
          seat.castShadow = true;
          group.add(seat);

          const back = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.benchWood);
          back.scale.set(0.12, 0.65, 2.3);
          back.position.set(side * 5.0, 0.9, pz - 4);
          group.add(back);
        }

        if (rand(i * 7 + side) > 0.38) {
          const hedge = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.hedge);
          hedge.scale.set(1.6, 1.35, 4.4);
          hedge.position.set(side * 6.8, 0.65, pz - 1.5);
          hedge.castShadow = true;
          group.add(hedge);
        } else {
          const trunk = new THREE.Mesh(this.sharedGeo.cyl, this.sharedMat.trunk);
          trunk.scale.set(0.28, 2.6, 0.28);
          trunk.position.set(side * 7.2, 1.3, pz);
          group.add(trunk);

          const crown = new THREE.Mesh(this.sharedGeo.sphere, this.sharedMat.leaves);
          crown.scale.set(1.8, 2.1, 1.8);
          crown.position.set(side * 7.2, 3.6, pz);
          crown.castShadow = true;
          group.add(crown);
        }
      }
    }

    for (let b = 0; b < 3; b++) {
      const bz = zStart - 7 - b * 13.5;
      for (const side of [-1, 1]) {
        const w = 6 + rand(b * 11 + side) * 6;
        const h = 14 + rand(b * 17 + side) * 28;
        const d = 8 + rand(b * 23 + side) * 5;
        const tex = this.buildingTextures[0];
        const tint = this.buildingColors[Math.floor(rand(b * 31 + side) * this.buildingColors.length)];
        const mat = new THREE.MeshStandardMaterial({ map: tex, color: tint, roughness: 0.55 });
        const bldg = new THREE.Mesh(this.sharedGeo.box, mat);
        bldg.scale.set(w, h, d);
        bldg.position.set(side * (12.5 + w * 0.5 + rand(b * 3 + side) * 4), h * 0.5 - 0.1, bz);
        group.add(bldg);
      }
    }

    if (index >= 1) {
      const distLabel = `${index * CHUNK_LEN}m`;
      const gateZ = zStart;
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(this.sharedGeo.cyl, this.sharedMat.gatePost);
        post.scale.set(0.2, 6.2, 0.2);
        post.position.set(side * 3.1, 3.1, gateZ);
        group.add(post);
      }
      const banner = new THREE.Mesh(
        this.sharedGeo.box,
        new THREE.MeshStandardMaterial({
          map: this.getSignTexture(distLabel, '#2563eb', '#ffffff'),
        })
      );
      banner.scale.set(6.6, 1.25, 0.25);
      banner.position.set(0, 6.0, gateZ);
      group.add(banner);
    }

    // Balanced spacing for interactive props so runs feel fair and always come to a real stop!
    if (index >= 1) {
      // Bounce pad every 3rd chunk (or every 2nd with Hyper Bounce powerup)
      const padFreq = extraPads ? 2 : 3;
      if (index % padFreq === 0) {
        const pz = zStart - 12 - rand(19) * 16;
        const px = (rand(29) - 0.5) * 2.4;
        const padGroup = new THREE.Group();
        const base = new THREE.Mesh(this.sharedGeo.pad, this.sharedMat.padBase);
        const core = new THREE.Mesh(this.sharedGeo.pad, this.sharedMat.padCore);
        core.scale.set(0.65, 1.15, 0.65);
        padGroup.add(base, core);
        padGroup.position.set(px, 0.14, pz);
        group.add(padGroup);
        props.push({
          id: propIdCounter++,
          type: 'pad',
          mesh: padGroup,
          x: px,
          y: 0.4,
          z: pz,
          radius: 1.9,
          triggered: false,
        });
      }

      // Explosive barrel every 4th chunk (offset from pads)
      if (index >= 2 && index % 4 === 2) {
        const bz = zStart - 16 - rand(43) * 16;
        const bx = (rand(47) - 0.5) * 2.2;
        const barrelGroup = new THREE.Group();
        const body = new THREE.Mesh(this.sharedGeo.barrel, this.sharedMat.barrelRed);
        const band = new THREE.Mesh(this.sharedGeo.barrel, this.sharedMat.barrelBand);
        band.scale.set(1.04, 0.25, 1.04);
        barrelGroup.add(body, band);
        barrelGroup.position.set(bx, 0.72, bz);
        group.add(barrelGroup);
        props.push({
          id: propIdCounter++,
          type: 'barrel',
          mesh: barrelGroup,
          x: bx,
          y: 0.8,
          z: bz,
          radius: 1.65,
          triggered: false,
        });
      }

      // Floating Golden Coin Ring every 2nd chunk
      if (index % 2 === 1) {
        const rz = zStart - 12 - rand(53) * 18;
        const rx = (rand(59) - 0.5) * 2.4;
        const ry = 3.0 + rand(61) * 5.5;
        const ring = new THREE.Mesh(this.sharedGeo.torus, this.sharedMat.ringGold);
        ring.position.set(rx, ry, rz);
        group.add(ring);
        props.push({
          id: propIdCounter++,
          type: 'ring',
          mesh: ring,
          x: rx,
          y: ry,
          z: rz,
          radius: 2.3,
          triggered: false,
        });
      }

      // Detailed Moving Car (NYC Taxi / Sports Coupe / Police Cruiser) crossing every 3rd chunk!
      if (index >= 2 && index % 3 === 1) {
        const tz = zStart - 20;
        const variant = index % 9 === 1 ? 'taxi' : index % 9 === 4 ? 'sports' : 'police';
        const carGroup = this.buildDetailedCar(variant);
        const startX = (rand(71) - 0.5) * 4;
        const dir = rand(79) > 0.5 ? 1 : -1;
        carGroup.position.set(startX, 0, tz);
        carGroup.rotation.y = dir > 0 ? 0 : Math.PI;
        group.add(carGroup);
        props.push({
          id: propIdCounter++,
          type: 'taxi',
          mesh: carGroup,
          x: startX,
          y: 0.9,
          z: tz,
          radius: 2.15,
          triggered: false,
          moveSpeed: 3.2 + rand(73) * 2.0,
          moveDir: dir,
        });
      }

      // Floating Gem Pinata Drone every 4th chunk (rare high-value sky target!)
      if (index >= 2 && index % 4 === 0) {
        const dz = zStart - 22;
        const dx = (rand(83) - 0.5) * 3.0;
        const dy = 4.6 + rand(89) * 4.0;
        const droneGroup = new THREE.Group();
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), this.sharedMat.dronePink);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.1, 8, 18), this.sharedMat.ringGold);
        halo.rotation.x = Math.PI / 2;
        droneGroup.add(core, halo);
        droneGroup.position.set(dx, dy, dz);
        group.add(droneGroup);
        props.push({
          id: propIdCounter++,
          type: 'drone',
          mesh: droneGroup,
          x: dx,
          y: dy,
          z: dz,
          radius: 2.15,
          triggered: false,
          baseY: dy,
        });
      }
    }

    return { index, zStart, group, props };
  }

  private buildDetailedCar(variant: 'taxi' | 'sports' | 'police'): THREE.Group {
    // Car faces +X by default (front at +X, rear at -X)
    const g = new THREE.Group();
    const bodyMat =
      variant === 'taxi'
        ? this.sharedMat.taxiYellow
        : variant === 'sports'
        ? this.sharedMat.carRed
        : this.sharedMat.carBlue;

    // Lower body chassis
    const chassis = new THREE.Mesh(this.sharedGeo.box, bodyMat);
    chassis.scale.set(2.55, 0.56, 1.32);
    chassis.position.set(0, 0.54, 0);
    chassis.castShadow = true;
    g.add(chassis);

    // Front hood slope accent
    const hood = new THREE.Mesh(this.sharedGeo.box, bodyMat);
    hood.scale.set(0.75, 0.24, 1.22);
    hood.position.set(0.86, 0.86, 0);
    hood.rotation.z = -0.18;
    g.add(hood);

    // Roof cabin shell
    const roof = new THREE.Mesh(this.sharedGeo.box, bodyMat);
    roof.scale.set(1.25, 0.48, 1.16);
    roof.position.set(-0.18, 1.04, 0);
    roof.castShadow = true;
    g.add(roof);

    // Wrap-around glossy windows (front/back + sides)
    const winFB = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.taxiGlass);
    winFB.scale.set(1.3, 0.34, 1.02);
    winFB.position.set(-0.18, 1.04, 0);
    g.add(winFB);

    const winSide = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.taxiGlass);
    winSide.scale.set(1.06, 0.34, 1.2);
    winSide.position.set(-0.18, 1.04, 0);
    g.add(winSide);

    // Front & rear chrome bumpers
    for (const end of [-1, 1]) {
      const bumper = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.rimSilver);
      bumper.scale.set(0.14, 0.18, 1.38);
      bumper.position.set(end * 1.3, 0.36, 0);
      g.add(bumper);
    }

    // Glowing headlights (+X) & taillights (-X)
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.headlight);
      hl.scale.set(0.1, 0.18, 0.26);
      hl.position.set(1.28, 0.58, side * 0.44);
      g.add(hl);

      const tl = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.taillight);
      tl.scale.set(0.1, 0.16, 0.28);
      tl.position.set(-1.28, 0.58, side * 0.44);
      g.add(tl);
    }

    // 4 Wheels with rubber tires + silver rims!
    for (const wx of [-0.78, 0.78]) {
      for (const wz of [-0.66, 0.66]) {
        const tire = new THREE.Mesh(this.sharedGeo.cyl, this.sharedMat.tireBlack);
        tire.scale.set(0.32, 0.22, 0.32);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(wx, 0.32, wz);
        tire.castShadow = true;
        g.add(tire);

        const rim = new THREE.Mesh(this.sharedGeo.cyl, this.sharedMat.rimSilver);
        rim.scale.set(0.18, 0.24, 0.18);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(wx, 0.32, wz);
        g.add(rim);
      }
    }

    // Variant roof details!
    if (variant === 'taxi') {
      const sign = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.headlight);
      sign.scale.set(0.34, 0.18, 0.56);
      sign.position.set(-0.12, 1.36, 0);
      g.add(sign);
    } else if (variant === 'police') {
      const barRed = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.taillight);
      barRed.scale.set(0.22, 0.16, 0.32);
      barRed.position.set(-0.15, 1.35, -0.2);
      const barBlue = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.padBase);
      barBlue.scale.set(0.22, 0.16, 0.32);
      barBlue.position.set(-0.15, 1.35, 0.2);
      g.add(barRed, barBlue);
    } else {
      // Sports car rear spoiler!
      const wing = new THREE.Mesh(this.sharedGeo.box, this.sharedMat.tireBlack);
      wing.scale.set(0.24, 0.08, 1.28);
      wing.position.set(-1.12, 0.98, 0);
      g.add(wing);
    }

    return g;
  }

  public getNearbyProps(z: number): InteractiveProp[] {
    const idx = Math.floor(-z / CHUNK_LEN);
    const result: InteractiveProp[] = [];
    for (let i = idx - 1; i <= idx + 1; i++) {
      const c = this.chunks.get(i);
      if (c) {
        for (const p of c.props) {
          if (!p.triggered) result.push(p);
        }
      }
    }
    return result;
  }

  public spawnBurst(pos: THREE.Vector3, color: number, count = 16, speed = 9): void {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.sharedGeo.box, mat);
      const s = 0.14 + Math.random() * 0.2;
      m.scale.setScalar(s);
      m.position.copy(pos);
      this.scene.add(m);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        mesh: m,
        vx: Math.sin(phi) * Math.cos(theta) * spd,
        vy: Math.abs(Math.cos(phi)) * spd + 2.5,
        vz: Math.sin(phi) * Math.sin(theta) * spd,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        scale: s,
      });
    }
  }

  public triggerShockwave(pos: THREE.Vector3, color = 0xfacc15): void {
    this.shockwaveRing.position.copy(pos);
    this.shockwaveRing.scale.setScalar(0.5);
    const mat = this.shockwaveRing.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 0.95;
    this.shockwaveRing.visible = true;
  }

  public resetTrail(): void {
    this.trailHistory = [];
    for (const node of this.trailNodes) node.visible = false;
  }

  public updateTrail(ballPos: THREE.Vector3, isRainbow: boolean, time: number): void {
    this.trailHistory.unshift(ballPos.clone());
    if (this.trailHistory.length > this.trailNodes.length) {
      this.trailHistory.pop();
    }
    for (let i = 0; i < this.trailNodes.length; i++) {
      const node = this.trailNodes[i];
      const p = this.trailHistory[i];
      if (p) {
        node.visible = true;
        node.position.copy(p);
        const s = Math.max(0.04, 0.2 * (1 - i / this.trailNodes.length));
        node.scale.setScalar(s);
        if (isRainbow) {
          (node.material as THREE.MeshBasicMaterial).color.setHSL(((time * 1.4 - i * 0.06) % 1 + 1) % 1, 0.95, 0.6);
        }
      } else {
        node.visible = false;
      }
    }
  }

  public updateEffects(dt: number, time: number, focusZ: number): void {
    this.skyMesh.position.set(0, 0, focusZ);
    this.sunLight.position.set(16, 32, focusZ + 18);
    this.sunLight.target.position.set(0, 0, focusZ - 10);

    for (const chunk of this.chunks.values()) {
      for (const p of chunk.props) {
        if (p.triggered) continue;
        if (p.type === 'ring') {
          p.mesh.rotation.y = time * 2.2;
        } else if (p.type === 'taxi' && p.moveSpeed && p.moveDir) {
          p.x += p.moveSpeed * p.moveDir * dt;
          if (p.x > 3.6) { p.moveDir = -1; p.mesh.rotation.y = Math.PI; }
          if (p.x < -3.6) { p.moveDir = 1; p.mesh.rotation.y = 0; }
          p.mesh.position.x = p.x;
        } else if (p.type === 'drone' && p.baseY !== undefined) {
          p.y = p.baseY + Math.sin(time * 3.0 + p.id) * 0.75;
          p.mesh.position.y = p.y;
          p.mesh.rotation.y = time * 2.6;
        }
      }
    }

    if (this.pitcherAura.visible) {
      const s = 1 + Math.sin(time * 6) * 0.1;
      this.pitcherAura.scale.setScalar(s);
    }

    if (this.shockwaveRing.visible) {
      this.shockwaveRing.scale.addScalar(dt * 18);
      const mat = this.shockwaveRing.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 2.4;
      if (mat.opacity <= 0) this.shockwaveRing.visible = false;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 22 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += dt * 7;
      p.mesh.rotation.y += dt * 5;
      p.mesh.scale.setScalar(p.scale * (1 - p.life / p.maxLife));
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
