import {
    Viewer,
    Ion,
    createWorldTerrainAsync,
    Cesium3DTileset,
    Cartesian2,
    Cartesian3,
    Math as CesiumMath,
    Entity,
    Color,
    ScreenSpaceEventHandler,
    ScreenSpaceEventType,
    CallbackProperty,
    HeightReference,
    VerticalOrigin,
    LabelStyle,
} from "cesium";
import "cesium/Widgets/widgets.css";

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

let towerCount = 0;

// -----------------------------
// HMP Wandsworth polygon coords (2D)
const coords: [number, number][] = [
    [-0.1774058, 51.4482544],
    [-0.1756854, 51.4491137],
    [-0.1761111, 51.4496076],
    [-0.1758669, 51.4496871],
    [-0.1760844, 51.4499424],
    [-0.1760117, 51.4500008],
    [-0.1760047, 51.4500172],
    [-0.1762307, 51.4503029],
    [-0.1764256, 51.4505693],
    [-0.1766609, 51.450628],
    [-0.1765754, 51.4507691],
    [-0.1769525, 51.451278],
    [-0.1771185, 51.4514967],
    [-0.1781567, 51.4511498],
    [-0.1794479, 51.4498498],
    [-0.1774058, 51.4482544]
];

// -----------------------------
async function start() {
    const viewer = new Viewer("cesiumContainer", {
        terrainProvider: await createWorldTerrainAsync(),
        animation: false,
        timeline: false,
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;

    // Fly camera to HMP Wandsworth
    viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(-0.1774058, 51.4482544, 150),
        orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-30),
            roll: 0,
        },
        duration: 3,
    });

    // Load OSM 3D Buildings
    const osmBuildings = await Cesium3DTileset.fromIonAssetId(96188);
    viewer.scene.primitives.add(osmBuildings);
    viewer.zoomTo(osmBuildings);

    // -----------------------------
    const extrudedHeight = 50; // 50m AGL

    // Compute ground positions
    const positionsGround: Cartesian3[] = coords.map(
        ([lon, lat]) => Cartesian3.fromDegrees(lon, lat, 0)
    );

    // Compute top positions
    const positionsTop: Cartesian3[] = positionsGround.map(
        (pos) => new Cartesian3(pos.x, pos.y, pos.z + extrudedHeight)
    );

    // -----------------------------
    // Polygon (extruded 50m)
    viewer.entities.add({
        polygon: {
            hierarchy: positionsGround,
            material: Color.RED.withAlpha(0.3),
            extrudedHeight,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            outline: true,
            heightReference: HeightReference.CLAMP_TO_GROUND,
        },
    });

    // -----------------------------
    // Ground edge
    viewer.entities.add({
        polyline: {
            positions: positionsGround,
            width: 2,
            material: Color.BLACK,
            clampToGround: true,
        },
    });

    // -----------------------------
    // Add Tower Button
    const addTowerBtn = document.getElementById("addTowerBtn")!;
    addTowerBtn.addEventListener("click", () => addTower(viewer));
}

start();

// -----------------------------
function addTower(viewer: Viewer) {
    towerCount += 1;
    const towerName = `Tower ${towerCount}`;
    const SPHERE_RADIUS = 200;

    const center = viewer.scene.pickPosition(
        new Cartesian2(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2)
    ) ?? Cartesian3.fromDegrees(-0.1774058, 51.4482544, 0);

    // Cylinder
    const cylinder = viewer.entities.add({
        position: center,
        cylinder: {
            length: 20,
            topRadius: 1,
            bottomRadius: 1,
            material: Color.BLACK,
            heightReference: HeightReference.NONE,
        },
        name: towerName,
    });

    // Label as popup above cylinder
    const label = viewer.entities.add({
        position: new CallbackProperty(() => {
            if (!cylinder.position) return Cartesian3.ZERO;

            // Clone current cylinder position
            const pos = Cartesian3.clone(cylinder.position.getValue(viewer.clock.currentTime));

            // Offset along Z axis by half cylinder length + small extra
            pos.z += (cylinder.cylinder?.length ?? 0) / 2 + 1;

            return pos;
        }, false),
        label: {
            text: towerName,
            font: "14pt sans-serif",
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -5),
            backgroundColor: Color.BLACK.withAlpha(0.5),
            showBackground: true,
            heightReference: HeightReference.NONE,
        },
    });

    // Sphere
    const sphere = viewer.entities.add({
        position: center,
        ellipsoid: {
            radii: new Cartesian3(SPHERE_RADIUS, SPHERE_RADIUS, SPHERE_RADIUS),
            material: Color.GREENYELLOW.withAlpha(0.2),
            outline: true,
            outlineColor: Color.GREEN,
        },
        heightReference: HeightReference.NONE,
    });

    // -----------------------------
    // Drag logic
    let moving = false;
    let pickedEntity: Entity | null = null;

    const handler = new ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction((click) => {
        const picked = viewer.scene.pick(click.position);
        if (picked && [cylinder, sphere].includes(picked.id as Entity)) {
            moving = true;
            pickedEntity = picked.id as Entity;

            viewer.scene.screenSpaceCameraController.enableRotate = false;
            viewer.scene.screenSpaceCameraController.enableTranslate = false;
            viewer.scene.screenSpaceCameraController.enableZoom = false;
            viewer.scene.screenSpaceCameraController.enableTilt = false;
            viewer.scene.screenSpaceCameraController.enableLook = false;
        }
    }, ScreenSpaceEventType.LEFT_DOWN);

    handler.setInputAction((movement) => {
        if (moving && pickedEntity) {
            const newPos = viewer.scene.pickPosition(movement.endPosition);
            if (newPos) {
                // Update only cylinder and sphere
                cylinder.position = newPos;
                sphere.position = newPos;
                // DO NOT update label.position!
                // The CallbackProperty will compute the correct top of cylinder
            }
        }
    }, ScreenSpaceEventType.MOUSE_MOVE);


    handler.setInputAction(() => {
        moving = false;
        pickedEntity = null;

        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;
    }, ScreenSpaceEventType.LEFT_UP);
}
