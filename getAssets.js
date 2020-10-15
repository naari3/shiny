result = Object.entries(assetMaps).map(m => m[1].body).reduce((r, o) => {
    Object.entries(o).forEach(([k, v]) => (r[k] = r[k] || []).push(v));
    return r;
}, Object.create(null));

const paths = mmodules(22);
const utils = asd.default;
const client = mmodules(4);

const SHINY_HOST = "https://shinycolors.enza.fun/";

const getAsset = async (assetName, version) => {
    const ext = paths.extname(assetName);
    const name = paths.basename(assetName, ext);

    // SHINY_HOST + "assets/" + assetName;
    const isAssetMap = name === "asset-map";
    const assetPath = assetName.includes("/assets/") ? assetName : "/assets/" + assetName;
    const encryptedName = utils.encryptPath(assetPath, name);

    const exactExts = [".m4a", ".mp4"];

    const assetUrl = SHINY_HOST + "assets/" + (isAssetMap ? "asset-map-" : "") + encryptedName + (exactExts.includes(ext) ? ext : "") + (version ? "?v=" + version : "");
    // console.log(assetUrl);

    const response = await fetch(assetUrl);
    const mimeType = response.headers.get("content-type");
    const ab = await response.arrayBuffer();

    if (mimeType.includes("text/plain")) {
        return await utils.decryptResource(ab);
    } else {
        return ab;
    }
}

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

const bufferToString = (buf) => {
    return String.fromCharCode.apply("", new Uint16Array(buf))
}

const largeBufferToString = (buf) => {
    const tmp = [];
    const len = 102400;
    for (let p = 0; p < buf.byteLength; p += len) {
        tmp.push(bufferToString(buf.slice(p, p + len)));
    }
    return tmp.join("");
}

const assignHash = (path, hashMap) => {
    const ext = paths.extname(path);
    const name = paths.basename(path, ext);
    const hash = hashMap[name];
    if (hash) {
        const assignedHash = `${hash}_${name}${ext}`;
        const dirName = paths.dirname(path);
        return paths.join(dirName, assignedHash);
    } else {
        return path;
    }
}

const convertToMap = (assets) =>
    assets.reduce((obj, v) => {
        obj[v.id] = v.hash;
        return obj;
    }, {});

(async () => {
    const characters = await Promise.all(
        [...Array(24).keys()].slice(1).map(
            async (i) => (await client.post(`characterAlbums/characters/${i}`)).body
        )
    );
    debugger;
    const hashMap = characters.reduce((o, i) => {
        const map = Object.assign(o, convertToMap(i.idolCostumes), convertToMap(i.produceIdols), convertToMap(i.supportIdols));
        map[String(i.id).padStart(3, "0")] = i.hash;
        return map;
    }
        , {})
    const assetMapChunkMetas = JSON.parse(await getAsset("/assets/asset-map.json"));
    const chunks = await Promise.all(
        assetMapChunkMetas.chunks.map(d => Object.entries(d)).map(d => d[0]).map(async (chunkData) => {
            return JSON.parse(await getAsset(...chunkData));
        })
    );
    const assetMap = chunks.reduce((a, b) => Object.assign(a, b));
    console.log(Object.keys(assetMap).length);
    let count = 21000;
    targetAssets = Object.entries(assetMap).slice(count);
    // targetAssets = Object.entries(assetMap).filter(a => a[0].includes(".mp4")).slice(count);
    console.log(Object.keys(targetAssets).length);
    const textEncoder = new TextEncoder();
    for (const a of targetAssets) {
        count++;
        const assetInfo = [assignHash(a[0], hashMap), a[1]];
        const asset = await getAsset(...assetInfo);
        let assetArray = [];
        if (typeof asset === "string") {
            assetArray = textEncoder.encode(asset);
        }
        if (asset instanceof ArrayBuffer) {
            assetArray = new Uint8Array(asset);
        }
        const data = btoa(largeBufferToString(assetArray));
        const fileName = a[0];

        const obj = { data, fileName };
        const method = "POST";
        const body = JSON.stringify(obj);
        const headers = {
            'Accept': 'application/json'
        };

        const res = await fetch("http://localhost:8080/receive", { method, headers, body })

        if (count % 1000 === 0) console.error(count);
        const sleepTime = 100 + Math.random() * 50 + (count % 500 === 0 ? 1000 : 0);
        // await sleep(100 + Math.random() * 100);
    }
    console.log("COMPLETED!")
})()
