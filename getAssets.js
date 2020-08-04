result = Object.entries(assetMaps).map(m => m[1].body).reduce((r, o) => {
    Object.entries(o).forEach(([k, v]) => (r[k] = r[k] || []).push(v));
    return r;
}, Object.create(null));

const paths = mmodules(22);
const utils = asd.default;

const SHINY_HOST = "https://shinycolors.enza.fun/";

const getAsset = async (assetName, version) => {
    const ext = paths.extname(assetName);
    const name = paths.basename(assetName, ext);

    // SHINY_HOST + "assets/" + assetName;
    const isAssetMap = name === "asset-map";
    const assetPath = assetName.includes("/assets/") ? assetName : "/assets/" + assetName;
    const encryptedName = utils.encryptPath(assetPath, name);

    const assetUrl = SHINY_HOST + "assets/" + (isAssetMap ? "asset-map-" : "") + encryptedName + (ext === ".m4a" ? ".m4a" : "") + (version ? "?v=" + version : "");
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

(async () => {
    const assetMapChunkMetas = JSON.parse(await getAsset("/assets/asset-map.json"));
    const chunks = await Promise.all(
        assetMapChunkMetas.chunks.map(d => Object.entries(d)).map(d => d[0]).map(async (chunkData) => {
            return JSON.parse(await getAsset(...chunkData));
        })
    );
    const assetMap = chunks.reduce((a, b) => Object.assign(a, b));
    console.log(Object.keys(assetMap).length);
    const targetAssets = Object.entries(assetMap).filter(a => !a[0].includes(".mp4"));
    const textEncoder = new TextEncoder();
    let count = 0;
    for (const a of targetAssets) {
        count++;
        const asset = await getAsset(...a);
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

        if (count % 1000 === 0) console.info(count);
        const sleepTime = 100 + Math.random() * 100 + (count % 500 === 0 ? 1000 : 0);
        await sleep(100 + Math.random() * 100);
    }
})()
