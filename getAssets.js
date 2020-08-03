result = Object.entries(assetMaps).map (m => m[1].body).reduce((r, o) => {
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

    const assetUrl = SHINY_HOST + "assets/" + (isAssetMap ? "asset-map-" : "") + encryptedName + (version ? "?v="+version : "");
    // console.log(assetUrl);

    const response = await fetch(assetUrl);
    const mimeType = response.headers.get("content-type");
    const ab = await response.arrayBuffer();

    if (mimeType === "text/plain") {
        return utils.decryptResource(ab);
    } else {
        return ab;
    }

    return fetch(assetUrl).then(d => d.arrayBuffer()).then(ab => utils.decryptResource(ab));
}

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

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
    for (const a of targetAssets) {
        await sleep(100);
        console.log(await getAsset(...a));
    }
})()
